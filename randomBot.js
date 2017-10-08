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

// states
// RUNNING, JUMPING, DUCKING, CRASHED

// key events (actions)
var duck = function() {
    console.info(">duck");
    if (Runner.instance_.tRex.status === "DUCKING") {
        triggerEvent('keyup', KEY.DOWN);
    } else {
        triggerEvent('keydown', KEY.DOWN);
    }
}
var jump = function() {
    console.info(">jump");
    if (Runner.instance_.tRex.status === "DUCKING") {
        return;
    }
    triggerEvent('keydown', KEY.UP);
    triggerEvent('keyup', KEY.UP);
};
var noop = function() {
    console.info(">noop");
    return;
}
var actions = [duck, jump, noop];

var runBot = function() {
    // read environment
    console.info(Runner.instance_.tRex.status, Runner.instance_.tRex.xPos, Runner.instance_.tRex.yPos);
    Runner.instance_.horizon.obstacles.forEach(function(obstacle) {
        console.info(obstacle.typeConfig.type, obstacle.xPos);
    });

    // do action based on environment
    if (Runner.instance_.tRex.status === "CRASHED") {
        Runner.instance_.restart(); // TODO: maybe use keyboard?
        return;
    }

    actions[randomNumber(0, actions.length-1)]();
};
var intervalID = window.setInterval(runBot, 1000 / fps);
