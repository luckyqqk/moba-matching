const CONSTANTS = require('./lib/constants');
/**
 * 传统moba游戏匹配系统
 *
 * 需求解析:
 * 一般来讲,moba中的匹配是根据匹配者的能力值(elo积分或者仅仅是玩家的星星数量),找到与其实力接近的玩家一起游戏.
 *
 * 实现分析:
 * 匹配者有两种匹配方式:单人匹配和多人组队匹配.
 * 无论是哪种方式,我们在匹配时仅仅需要两个信息:能力值和匹配人数.
 * 于是我封装了一个匹配者的信息类,称之:竞选者.文件位置:./lib/contestant.js
 *
 * 当该系统的使用者需要将某个玩家或者队伍扔进匹配队列时,
 * 需先new一个contestant,给这个contestant分配一个唯一的id,一旦匹配成功,仅仅会以事件的方式,传出红蓝双方contestant.id的数组.
 * 使用者需监听该事件,拿到匹配成功的id们,之后使用者就可以随意的使用这些id们了.
 *
 * 系统简析:
 * 该系统会根据竞选者的人数,将竞选者放入单人/多人队列中,
 * 每matchingDelay毫秒会执行一轮匹配,每轮匹配最多产出maxProduction个匹配对.
 * 系统会优先从多人队列中选取匹配种子选手,且优先从多人队列中匹配(匹配出1组多人,数量不够从单人队列选取),人数正好为fighterNum时成功.
 * 对于竞选者来说,第一轮会根据自身能力值和允许范围值,在队列的0-maxSearch中匹配最优的玩家,若人数不足则在队尾等待下一轮.
 * 第二轮会放宽范围值到2倍,且临近原则,只要是在范围值以内的玩家,就可以匹配成功.且人数不足的时候会用机器人站位(机器人id统一为-1)
 *
 * 如何使用:
 * 请查阅实例代码:demo/test.js
 *
 * 初始化参数:
 * 参阅lib/constants中的ARGS
 *
 * @author wqk
 * @date 2018/5/30
 * @param emitter
 * @param args
 * @constructor
 */
const MOBAMatching = function(emitter, args) {
    this.status = CONSTANTS.STATUS.NEW;
    if (!emitter)
        return;
    args = args || {};
    this.emitter = emitter;
    this.name           = args[CONSTANTS.ARGS.NAME]             || CONSTANTS.DEFAULT_ARGS.NAME;
    this.maxSearch      = args[CONSTANTS.ARGS.MAX_SEARCH]       || CONSTANTS.DEFAULT_ARGS.MAX_SEARCH;
    this.fighterNum     = args[CONSTANTS.ARGS.FIGHTER_NUM]      || CONSTANTS.DEFAULT_ARGS.FIGHTER_NUM;
    this.timeoutLoop    = args[CONSTANTS.ARGS.TIMEOUT_LOOP]     || CONSTANTS.DEFAULT_ARGS.TIMEOUT_LOOP;
    this.teamMastTeam   = args[CONSTANTS.ARGS.TEAM_MAST_TEAM]   || CONSTANTS.DEFAULT_ARGS.TEAM_MAST_TEAM;
    this.matchingDelay  = args[CONSTANTS.ARGS.MATCHING_DELAY]   || CONSTANTS.DEFAULT_ARGS.MATCHING_DELAY;
    this.maxProduction  = args[CONSTANTS.ARGS.MAX_PRODUCTION]   || CONSTANTS.DEFAULT_ARGS.MAX_PRODUCTION;

    this.teamQueue = [];
    this.singleQueue = [];
    this.contestants = {};
};

MOBAMatching.prototype.start = function() {
    if (this.status == CONSTANTS.STATUS.DESTROY) {
        this.emitter.emit(CONSTANTS.EVENT.START_FAIL, 'has already destroyed!');
        return;
    }
    this.status = CONSTANTS.STATUS.START;
    _startMatching(this);
    this.emitter.emit(CONSTANTS.EVENT.SERVER_START);
};
/**
 * 关闭,关闭后可重新启动
 */
MOBAMatching.prototype.stop = function() {
    this.status = CONSTANTS.STATUS.STOPPED;
    this.emitter.emit(CONSTANTS.EVENT.SERVER_STOP);
};
/**
 * 销毁,销毁后无法重新启动
 */
MOBAMatching.prototype.destroy = function() {
    this.status = CONSTANTS.STATUS.DESTROY;
    this.emitter = null;
    this.singleQueue = null;
    this.teamQueue = null;
    this.contestants = null;
    this.emitter.emit(CONSTANTS.EVENT.SERVER_DESTROY);
};

module.exports.MOBAMatching = MOBAMatching;
module.exports.Contestant = require('./lib/contestant');
module.exports.Const = require('./lib/constants');

/**
 * 添加匹配竞选者
 * @param {Object} contestant   the param is object by ./contestant.js
 */
MOBAMatching.prototype.addContestant = function(contestant) {
    let reason = null;
    if (this.status != CONSTANTS.STATUS.START)
        reason = 'status not start';
    else if (!contestant || !contestant.id)
        reason = 'contestant has no id';
    else if (contestant.memberSize > this.fighterNum / 2)
        reason = 'contestant.memberSize is above fighterNum';
    if (!!reason) {
        this.emitter.emit(CONSTANTS.EVENT.ON_FAIL_JOIN, contestant.id, reason);
        return;
    }

    if (contestant.memberSize == 1)
        this.singleQueue.push(contestant.id);
    else
        this.teamQueue.push(contestant.id);
    this.contestants[contestant.id] = contestant;
    this.emitter.emit(CONSTANTS.EVENT.ON_JOINED, contestant.id);
};

/**
 * 取消匹配
 * @param id    竞选者id
 */
MOBAMatching.prototype.quitContestant = function(id) {
    if (!this.contestants[id]) {
        this.emitter.emit(CONSTANTS.EVENT.QUIT_FAILED, 'not in matching');
        return;
    }
    delete this.contestants[id];
    let idx = this.singleQueue.indexOf(id);
    if (idx != -1)
        this.singleQueue.splice(idx, 1);

    idx = this.teamQueue.indexOf(id);
    if (idx != -1)
        this.teamQueue.splice(idx, 1);
    this.emitter.emit(CONSTANTS.EVENT.QUIT_SUCCESS, id);
};

/**
 * 每matchingDelay执行一轮匹配, 每轮匹配最大产出maxProduction个
 * @param self
 * @private
 */
function _startMatching(self) {
    if (self.status != CONSTANTS.STATUS.START)
        return;
    // console.error(self.contestants)
    _teamMatching(self);
    _singleMatching(self);
    setTimeout(_startMatching, self.matchingDelay, self);
}

/**
 * 从队伍队列匹配
 * @param self
 * @private
 */
function _teamMatching(self) {
    let idQueue = self.teamQueue, contestants = self.contestants, fighterNum = self.fighterNum / 2;
    let maxProduction = Math.min(idQueue.length - 1, self.maxProduction);
    let maxSearch = Math.min(idQueue.length - 1, self.maxSearch);

    for (let i = 0; i < maxProduction; i++) {
        let outIdArr = _matchingOnce(self, idQueue, maxSearch, 2, self.teamMastTeam);
        if (!outIdArr)
            break;
        if (outIdArr.length == 0)
            continue;

        let redTeam = [], blueTeam = [], hasRobot = false;
        let redId = outIdArr[0], blueId = outIdArr[1];
        let redContestant = contestants[redId], blueContestant = contestants[blueId];
        let redNum = redContestant.memberSize;  // 肯定有值
        let blueNum = 0;
        if (!!blueContestant) {
            blueNum = blueContestant.memberSize;
            blueTeam.push(blueContestant.id);
        }
        redTeam.push(redContestant.id);
        let redLessNum = fighterNum - redNum;
        let blueLessNum = fighterNum - blueNum;
        let lessNum = redLessNum + blueLessNum;
        if (!!lessNum) {
            let lessIds = _searchIdxNearStarFromQueue(redContestant.eloStar, redContestant.rangeStar*2, self.singleQueue, maxSearch, contestants, lessNum);
            lessIds.forEach(tempId=>{
                blueTeam.length < redTeam.length  ? blueTeam.push(tempId) : redTeam.push(tempId);
                if (tempId == -1)
                    hasRobot = true;
                else
                    delete contestants[tempId]; // 删除对象
            });
        }

        self.emitter.emit(CONSTANTS.EVENT.WIN_MATCHING, redTeam, blueTeam, hasRobot);
    }
}

/**
 * 从单人队列匹配
 * @param self
 * @private
 */
function _singleMatching(self) {
    let idQueue = self.singleQueue, contestants = self.contestants, fighterNum = self.fighterNum;
    let maxProduction = Math.min(idQueue.length - 1, self.maxProduction);
    let maxSearch = Math.min(idQueue.length - 1, self.maxSearch);
    for (let i = 0; i < maxProduction; i++) {
        let outIdArr = _matchingOnce(self, idQueue, maxSearch, fighterNum, 0);
        if (!outIdArr)
            break;
        if (outIdArr.length == 0)
            continue;

        let redTeam = [], blueTeam = [], hasRobot = false;
        outIdArr.forEach(tempId=>{
            // 交叉式分拨
            blueTeam.length < redTeam.length  ? blueTeam.push(tempId) : redTeam.push(tempId);
            if (tempId == -1)
                hasRobot = true;  // 匹配玩家不足,用机器人代替吧
            else
                delete contestants[tempId]; // 删除对象
        });

        self.emitter.emit(CONSTANTS.EVENT.WIN_MATCHING, redTeam, blueTeam, hasRobot);
    }
}

/**
 * 单次产出.注:
 *          返回null表示资源不足,不需要继续产出.
 *          Array长度为0表示该次匹配不成功,但可继续尝试产出.
 *          Array长度为fighterNum表示匹配成功.
 * @param {Object}  self
 * @param {Array} idQueue           匹配队列
 * @param {number} maxSearch        最大检索个数
 * @param {number}  fighterNum      如果是队伍匹配,这里填写2
 * @param {number}  noRobot         是否允许机器人
 * @returns {Array|null}            返回匹配成功的id数组(均已从队列删除, 但未删除对象)
 * @private
 */
function _matchingOnce(self, idQueue, maxSearch, fighterNum, noRobot) {
    let id = idQueue.pop();
    if (!id)    // 空队列直接返回
        return null;
    let contestants = self.contestants;
    let contestant = contestants[id];
    if (!contestant)    // 无效竞选者,直接返回
        return null;
    let loopTime = contestant.loopTime;
    let size = Math.min(idQueue.length, maxSearch);
    let outNum = fighterNum - 1;
    if (!loopTime && size < outNum)  {
        // 匹配个数不足,队列中所有人匹配次数加1,返回
        idQueue.splice(0, 0, id);
        idQueue.forEach(tempId=>{
            if (contestants[tempId].loopTime++ == self.timeoutLoop) {
                self.emitter.emit(CONSTANTS.EVENT.TIMEOUT_LOOP, id);
            }
        });
        return null;
    }
    let eloStar = contestant.eloStar, rangeStar = contestant.rangeStar;
    let outIdx = !loopTime || noRobot
        ? _searchIdxMostNearStarFromQueue(eloStar, rangeStar, idQueue, size, contestants, outNum)
        : _searchIdxNearStarFromQueue(eloStar, rangeStar*2, idQueue, size, contestants, outNum);

    if (!outIdx) {
        if (contestant.loopTime++ == self.timeoutLoop) {
            self.emitter.emit(CONSTANTS.EVENT.TIMEOUT_LOOP, id);
        } else {
            idQueue.push(id);
        }
        return [];
    } else {
        let idArr = [];
        idArr.push(id);
        outIdx.forEach(idx=>{
            let tempId = 0;
            if (idx != -1) {
                tempId = idQueue[idx];
                idQueue.splice(idx, 1);
            } else {
                tempId = idx;
            }
            idArr.push(tempId);
        });
        return idArr;
    }
}

/**
 * 临近原则,选择队列中与eloStar相差在rangeStar范围内的对象,取其下标返回,匹配人数不足的用-1(机器人)填充,本方法不改变原idQueue
 * @param eloStar
 * @param rangeStar
 * @param idQueue
 * @param maxSearch
 * @param contestants
 * @param outNum
 * @returns {Array|null} 符合条件的对象所在idQueue中的下标
 * @private
 */
function _searchIdxNearStarFromQueue(eloStar, rangeStar, idQueue, maxSearch, contestants, outNum) {
    let idxArr = [];
    for (let i = 0; i < maxSearch; i++) {
        if (Math.abs(eloStar - contestants[idQueue[i]].eloStar) > rangeStar)
            continue;
        idxArr.push(i);
        if (outNum == idxArr.length)
            return idxArr;
    }
    let lessNum = outNum - idxArr.length;
    for (let i = 0; i < lessNum; i++) {
        idxArr.push(-1);    // -1表示替换成机器人
    }
    return idxArr;
}

/**
 * 遍历全部idQueue,选择与eloStar相差rangeStar范围内最接近eloStar的outNum个对象,取其下标返回,本方法不改变原idQueue
 * @param eloStar
 * @param rangeStar
 * @param idQueue
 * @param maxSearch
 * @param contestants
 * @param outNum
 * @returns {Array|null} 符合条件的对象所在idQueue中的下标
 * @private
 */
function _searchIdxMostNearStarFromQueue(eloStar, rangeStar, idQueue, maxSearch, contestants, outNum) {
    let diffArr = [];
    for (let i = 0; i < maxSearch; i++) {
        if (!idQueue[i]) {
            console.error(`idQueue.length:${idQueue.length}, i:${i}, maxSearch:${maxSearch}`);
        }
        let diffStar = Math.abs(eloStar - contestants[idQueue[i]].eloStar);
        if (diffStar > rangeStar)
            continue;
        diffArr.push({idx:i, diffStar:diffStar});
    }
    if (diffArr.length < outNum)
        return null;
    diffArr.sort((a, b)=>{
        return a.diffStar - b.diffStar;
    });
    let idxArr = [];
    for (let i = 0; i < outNum; i++) {
        idxArr.push(diffArr[i].idx);
    }
    return idxArr;
}