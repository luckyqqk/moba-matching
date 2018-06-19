
const MOBAMatching = require('../index').MOBAMatching;
const Contestant = require('../index').Contestant;
const EVENT_NAME = require('../index').Const.EVENT;
const EventEmitter = require('events').EventEmitter;
const eventEmitter = new EventEmitter();

const testMatching = new MOBAMatching(eventEmitter);

testMatching.start();

for (let key in EVENT_NAME) {
    if (!EVENT_NAME.hasOwnProperty(key))
        continue;
    eventEmitter.on(EVENT_NAME[key], data=>{
        console.error(key);
        console.error(data);
    });
}

for (let i = 0; i < 100000; i++) {
    let tempContestant = new Contestant(i, Math.floor(900 + Math.random() * 100), 4, Math.floor(1 + Math.random() * 2));
    testMatching.addContestant(tempContestant.toJson());
}

setTimeout(testMatching.stop.bind(testMatching), 5000);

