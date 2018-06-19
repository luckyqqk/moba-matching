module.exports = {
    // 配置
    ARGS: {
        NAME            :   'name',             // 队列名称
        MATCHING_DELAY  :   'matchingDelay',    // 匹配间隔,单位毫秒.
        MAX_SEARCH      :   'maxSearch',        // 检索队列时的最大值.如:当前有10w人匹配,只从前1w人中匹配出当次人员
        MAX_PRODUCTION  :   'maxProduction',    // 单轮匹配最大产出,单位个.
        TEAM_MAST_TEAM  :   'teamMastTeam',     // 队伍必须匹配队伍,不含补员
        TIMEOUT_LOOP    :   'timeoutLoop',      // 超时轮数
        FIGHTER_NUM     :   'fighterNum',       // 对战双方总人数(偶数)
    },
    // 配置默认值
    DEFAULT_ARGS: {
    NAME                :   'moba-matching',    // 队列名称
        MATCHING_DELAY  :   5000,               // 匹配间隔,单位毫秒.
        MAX_SEARCH      :   10000,              // 检索队列时的最大值.如:当前有10w人匹配,只从前1w人中匹配出当次人员
        MAX_PRODUCTION  :   10000,              // 单轮匹配最大产出,单位个.
        TEAM_MAST_TEAM  :   1,                  // 队伍必须匹配队伍,不含补员
        TIMEOUT_LOOP    :   5,                  // 超时轮数
        FIGHTER_NUM     :   4                   // 对战双方总人数(偶数)
    },
    // 事件名
    EVENT: {
        SERVER_START    :   'serverStart',
        START_FAIL      :   'startFail',
        SERVER_STOP     :   'serverStop',
        SERVER_DESTROY  :   'serverDestroy',
        ON_JOINED       :   'onJoined',
        ON_FAIL_JOIN    :   'failJoin',
        QUIT_SUCCESS    :   'quitSuccess',
        QUIT_FAILED     :   'quitFailed',
        TIMEOUT_LOOP    :   'timeoutLoop',
        WIN_MATCHING    :   'winMatching'
    },
    // 状态
    STATUS:{
        NEW             : 0,
        START           : 1,
        STOPPED         : 2,
        DESTROY         : 3
    },
    // 状态码
    // CODE: {
    //     SUCCESS     :   200,
    //     FAIL        :   500
    // }
};