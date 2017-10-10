// config
const gamma = 0.9;
const alpha = 0.1;
const epsilon = 0.01;
const positive_award = 1;
const negative_award = -100;
const fps = 30;

// helpers
var randomNumber = function(min, max) {
    return Math.floor((Math.random() * (max-min+1)) + min);
};
const KEY = {
    DOWN: 40,
    UP: 38,
    SPACE: 32
};
var triggerEvent = function(type, keyCode) {
    var e = document.createEvent('HTMLEvents');
    e.keyCode = keyCode;
    e.initEvent(type, false, true);
    document.dispatchEvent(e);
};
// https://stackoverflow.com/questions/11301438/return-index-of-greatest-value-in-an-array
var argMax = function(arr) {
    if (arr.length === 0) { return -1; }
    var max = arr[0];
    var maxIndex = 0;
    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }
    return maxIndex;
};
// https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Math/max
function getMaxOfArray(numArray) {
  return Math.max.apply(null, numArray);
}

// key events (actions)
var duck = function() {
    // console.info(">duck");
    if (Runner.instance_.tRex.status === "DUCKING") {
        triggerEvent('keyup', KEY.DOWN);
    } else {
        triggerEvent('keydown', KEY.DOWN);
    }
}
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
}
var actions = [noop, jump, duck];

var restart = function() {
    Runner.instance_.restart();
    Runner.instance_.tRex.xPos = 24
}



var qValues = [];


// OBSTACLE - TREX
var initQValues = function() {
    ["WAITING", "CRASHED", "RUNNING", "JUMPING", "DUCKING"].forEach(function(status) {
        for (var speed = 6; speed <= 13; ++speed) {
            ["NOTHING", "CACTUS_SMALL", "CACTUS_LARGE", "PTERODACTYL"].forEach(function(obstacle_type) {
                for(var distanceX = -5; distanceX <= 30; ++distanceX) {
                    for(var distanceY = -4; distanceY <= 20; ++distanceY) {
                        [1, 2, 3].forEach(function(obstacle_size) {
                            qValues[[status, speed, obstacle_type, distanceX, distanceY, obstacle_size]] = [0, 0, 0];
                        });
                    }
                }
            });
        }
    });
};

var getQValues = function(state) {
    // console.log(state);
    return qValues[[state.status, state.speed, state.obstacle_type, state.distanceX, state.distanceY, state.obstacle_size]];
};
var setQValue = function(state, action, value) {
    qValues[[state.status, state.speed, state.obstacle_type, state.distanceX, state.distanceY, state.obstacle_size]][action] = value;
};

// TODO! make this a bit better
var getStateFromTrex = function() {
    var tRexState = {};

    tRexState["status"] = Runner.instance_.tRex.status;
    // tRexState["speed"] = Math.floor(Runner.instance_.currentSpeed * 5.0);
    tRexState["speed"] = Math.round(Runner.instance_.currentSpeed);

    var obstacles = Runner.instance_.horizon.obstacles;
    if (obstacles.length === 0) {
        tRexState["obstacle_type"] = "NOTHING";
        tRexState["distanceX"] = 0;
        tRexState["distanceY"] = 0;
        tRexState["obstacle_size"] = 1;
        return tRexState;
    }

    var tRex_x, tRex_y, obstacleType, obstacleSize, distanceX, distanceY;
    tRex_x = Runner.instance_.tRex.xPos;
    tRex_y = Runner.instance_.tRex.yPos;
    obstacleType = obstacles[0].typeConfig.type;
    obstacleSize = obstacles[0].size;

    if (obstacles.length === 1) {
        distanceX = Math.floor((obstacles[0].xPos - Runner.instance_.tRex.xPos) / 10.0);
        distanceX = (distanceX > 30) ? 30 : distanceX;
        distanceY = Math.floor((obstacles[0].yPos - Runner.instance_.tRex.yPos) / 10.0);

        if (distanceX < 0) {
            tRexState["obstacle_type"] = "NOTHING";
            tRexState["distanceX"] = 0;
            tRexState["distanceY"] = 0;
            tRexState["obstacle_size"] = 1;
            return tRexState;
        }

        tRexState["obstacle_type"] = obstacleType;
        tRexState["distanceX"] = distanceX;
        tRexState["distanceY"] = distanceY;
        tRexState["obstacle_size"] = obstacleSize;
        return tRexState;

    } else {
        // check if one is already gone
        // distanceX = (obstacles[0].xPos - Runner.instance_.tRex.xPos);
        distanceX = Math.floor((obstacles[0].xPos - Runner.instance_.tRex.xPos) / 10.0);
        distanceX = (distanceX > 30) ? 30 : distanceX;
        distanceY = Math.floor((obstacles[0].yPos - Runner.instance_.tRex.yPos) / 10.0);
        obstacleType = obstacles[0].typeConfig.type;
        obstacleSize = obstacles[0].size;

        if (distanceX < 0) {
            // yes
            // distanceX = (obstacles[1].xPos - Runner.instance_.tRex.xPos);
            distanceX = Math.floor((obstacles[1].xPos - Runner.instance_.tRex.xPos) / 10.0);
            distanceX = (distanceX > 30) ? 30 : distanceX;
            distanceY = Math.floor((obstacles[1].yPos - Runner.instance_.tRex.yPos) / 10.0);
            obstacleType = obstacles[1].typeConfig.type;
            obstacleSize = obstacles[1].size;
            tRexState["obstacle_type"] = obstacleType;
            tRexState["distanceX"] = distanceX;
            tRexState["distanceY"] = distanceY;
            tRexState["obstacle_size"] = obstacleSize;
            return tRexState;
        }

        tRexState["obstacle_type"] = obstacleType;
        tRexState["distanceX"] = distanceX;
        tRexState["distanceY"] = distanceY;
        tRexState["obstacle_size"] = obstacleSize;
        return tRexState;
    }
};

var greedy = function(state) {
    return argMax(getQValues(state));
};

var epsGreedy = function(epsilon, state) {
    var prob = Math.random();
    if(prob <= epsilon) {
        return randomNumber(0, actions.length-1);
    } else {
        return argMax(getQValues(state));
    }
};

var qLearningUpdate = function(gamma, alpha, currentState, action, nextState, reward) {
    try {
        var targetNextState = reward + gamma * getMaxOfArray(["duck", "jump", "noop"].map(function(actionName, actionIndex) {
            return getQValues(nextState)[actionIndex];
        }));
        setQValue(currentState, action, (1 - alpha) * getQValues(currentState)[action] + alpha * targetNextState);
    } catch(e) {
        console.log(getQValues(currentState));
        console.log(getQValues(nextState));
    }
};


var currentState = getStateFromTrex();
var nextState;
var action = 0; //noop

var iteration = 1;
var intervalID;

initQValues();
var runBot = function() {
    // this is always the new state, since it waited (1000/fps) ms
    // console.info(Runner.instance_.tRex.status);

    // read out next state and update qValues
    nextState = getStateFromTrex();


    if (nextState.status === "WAITING") {
        return;
    }

    // calculate reward
    var reward;
    if (nextState.status !== "CRASHED") {
        reward = positive_award;
        // console.info("reward: +1");
    } else {
        reward = negative_award;
        // console.info("reward: -100");
    }

    qLearningUpdate(gamma, alpha, currentState, action, nextState, reward);

    currentState = nextState;

    action = epsGreedy(epsilon, currentState);

    // perform action
    if (nextState.status !== "CRASHED") {
        actions[action]();
    } else {

        // every ten times, run test evaluation
        ++iteration;
        console.log("Iteration: ", iteration);
        if (iteration % 10 === 0) {
            window.clearInterval(intervalID);
            console.log("TESTRUN");
            intervalID = window.setInterval(testRun, 1000 / fps);
        }
        restart();
    }
};

var scores = [];
var testRun = function() {
    var state = getStateFromTrex();
    console.log(getQValues(state));
    // console.log(state);
    if (state.status === "WAITING") {
        return;
    }
    if (state.status === "CRASHED") {
        var score = Runner.instance_.distanceRan / 40.0;
        scores.push(score);
        console.log("Iteration:", iteration, "Score:", score);
        window.clearInterval(intervalID);
        intervalID = window.setInterval(runBot, 1000 / fps);
        restart();
    }
    action = greedy(state);
    actions[action]();
};

intervalID = window.setInterval(runBot, 1000 / fps);
