// config
const fps = 30;

// helpers
var randomNumber = function(min, max) {
    return Math.floor((Math.random() * (max-min+1)) + min);
};
const KEY = {
    DOWN: 40,
    UP: 38
};
var triggerEvent = function(type, keyCode) {
    var e = document.createEvent('HTMLEvents');
    e.keyCode = keyCode;
    e.initEvent(type, false, true);
    document.dispatchEvent(e);
};

// key events (actions)
var duck = function() {
    // console.info(">duck");
    if (Runner.instance_.tRex.status === "DUCKING") {
        triggerEvent('keyup', KEY.DOWN);
    } else {
        triggerEvent('keydown', KEY.DOWN);
    }
};
var jump = function() {
    // console.info(">jump");
    if (Runner.instance_.tRex.status === "DUCKING") {
        return;
    }
    triggerEvent('keydown', KEY.UP);
    triggerEvent('keyup', KEY.UP);
};
var noop = function() {
    // console.info(">noop");
    return;
};
var actions = [duck, jump, noop];

var restart = function() {
    Runner.instance_.restart();
    Runner.instance_.tRex.xPos = 24
};

var iteration = 1;
var scores = [];

var runBot = function() {
    if (Runner.instance_.tRex.status === "WAITING") {
        return;
    }

    if (Runner.instance_.tRex.status === "CRASHED") {
        var score = Runner.instance_.distanceRan / 40;
        scores.push(score);
        console.log("Iteration #", iteration, ": ", score);
        ++iteration;
        if (iteration <= 100) {
            restart();
        } else {
            window.clearInterval(intervalID);
        }
        return;
    }

    // read environment
    // console.info(Runner.instance_.tRex.status, Runner.instance_.tRex.xPos, Runner.instance_.tRex.yPos);
    // Runner.instance_.horizon.obstacles.forEach(function(obstacle) {
    //     console.info(obstacle.typeConfig.type, obstacle.xPos, obstacle.yPos, obstacle.width);
    // });

    // do action based on environment
    actions[randomNumber(0, actions.length-1)]();
};
var intervalID = window.setInterval(runBot, 1000 / fps);
