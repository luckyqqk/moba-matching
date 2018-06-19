
class Contestant {
    constructor(id, eloStar, rangeStar, memberSize) {
        this.id = id;                   // 作为竞选者的唯一标识
        this.eloStar = eloStar || 0;    // 匹配参照分,如果是队伍,请填写其队员的平均值
        this.rangeStar = rangeStar;     // eloStar相差多少的人可以匹配到一块
        this.memberSize = memberSize || 1;
        this.loopTime = 0;              // 第几次匹配
    }
    toJson() {
        let res = {};
        for (let k in this) {
            if (!this.hasOwnProperty(k))
                continue;
            res[k] = this[k];
        }
        return res;
    }
}

module.exports = Contestant;