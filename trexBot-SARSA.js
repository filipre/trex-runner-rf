// TODO s:
/*
- take multiple samples and average them out, before updating Q Table / Function approximate
- decrease learning rate over time
-
*/

// config
const gamma = 0.9; // discount factor
const alpha = 0.1; // learning rate
const epsilon = 0.1;
const negative_award = -1;
const fps = 10;

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
function max_array(numArray) {
  return Math.max.apply(null, numArray);
}
function min_array(numArray) {
  return Math.min.apply(null, numArray);
}

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

// 3 Actions: do nothing, jump or duck
var actions = {
    "noop": noop,
    "jump": jump,
    "duck": duck
};

var restart = function() {
    Runner.instance_.restart();
    Runner.instance_.tRex.xPos = 24;
};

// 8+1 Features: speed, status, xPos, yPos, 0_type, 0_xPos, 0_yPos, 0_size + bias
// TODO: redo this
var getTrexState = function() {
    var tRexState = {};
    tRexState.currentSpeed = (Runner.instance_.currentSpeed - 6) / (13 - 6);
    switch (Runner.instance_.tRex.status) {
        case "RUNNING":
            tRexState.status = 0.25;
        case "JUMPING":
            tRexState.status = 0.5;
        case "DUCKING":
            tRexState.status = 0.75;
        default:
            tRexState.status = 0;
    }
    tRexState.tRexXPos = (Runner.instance_.tRex.xPos - 0) / (650 - 0);
    tRexState.tRexYPos = (Runner.instance_.tRex.yPos - 0) / (200 - 0);
    if (Runner.instance_.horizon.obstacles.length > 0) {
        tRexState.obstacle0XPos = (Runner.instance_.horizon.obstacles[0].xPos - 0) / (650 - 0);
        tRexState.obstacle0YPos = (Runner.instance_.horizon.obstacles[0].yPos - 0) / (200 - 0);
        tRexState.obstacle0Size = (Runner.instance_.horizon.obstacles[0].size - 1) / (3 - 1);
    } else {
        tRexState.obstacle0XPos = 0;
        tRexState.obstacle0YPos = 0;
        tRexState.obstacle0Size = 0;
    }
    tRexState.bias = 1;
    return tRexState;
};

// Our basis functions: F_i
var features = function(state, action) {
    switch(action) {
        case "noop":
            return [state.currentSpeed, state.tRexXPos, state.tRexYPos, state.obstacle0XPos, state.obstacle0YPos, state.obstacle0Size, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
        case "jump":
            return [0, 0, 0, 0, 0, 0, state.currentSpeed, state.tRexXPos, state.tRexYPos, state.obstacle0XPos, state.obstacle0YPos, state.obstacle0Size, 0, 0, 0, 0, 0, 0, 1];
        case "duck":
            return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, state.currentSpeed, state.tRexXPos, state.tRexYPos, state.obstacle0XPos, state.obstacle0YPos, state.obstacle0Size, 1];
    }
};

// learnable parameters w_i, initialized to zero
var weights = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

// linear function Q(s, a) parameterized by weights w
// Q(s, a) = 1 * w_0 + F_1 * w_1 + ... + F_n * w_n
var Q_weights = function(state, action) {
    var myFeatures = features(state, action);
    var result = 0;
    for(var i=0; i<weights.length; i++) {
        result += weights[i] * myFeatures[i];
    }
    return result;
};

// difference between (s, a), reward and (s', a')
var delta = function(state, action, reward, statePrime, actionPrime) {
    return reward + gamma * Q_weights(statePrime, actionPrime) - Q_weights(state, action);
};

// update our weights to improve behaviour
var updateWeights = function(oldState, oldAction, reward, newState, newAction) {
    var myDelta = delta(oldState, oldAction, reward, newState, newAction);
    var myFeatures = features(oldState, oldAction);
    for (var i=0; i<weights.length; i++) {
        weights[i] = weights[i] + alpha * myDelta * myFeatures[i];
    }
};

var greedy = function(state) {
    var q_noop = Q_weights(state, "noop");
    var q_jump = Q_weights(state, "jump");
    var q_duck = Q_weights(state, "duck");
    if (q_noop >= q_jump && q_noop >= q_duck) {
        return "noop";
    }
    if (q_jump >= q_noop && q_jump >= q_duck) {
        return "jump";
    }
    if (q_duck >= q_noop && q_duck >= q_jump) {
        return "duck";
    }
}

var epsGreedy = function(state) {
    if (Math.random() < epsilon) {
        return Object.keys(actions)[randomNumber(0, Object.keys(actions).length-1)];
    } else {
        return greedy(state);
    }
};

var observeReward = function() {
    if (Runner.instance_.tRex.status === "CRASHED") {
        return -1;
    }
    return 0;
};

var currentState, currentAction, reward, nextState, nextAction;
currentState = getTrexState();
currentAction = epsGreedy(currentState);

var algorithm = function() {
    console.log(weights);

    if (Runner.instance_.tRex.status === "WAITING") {
        return; // don't start yet, window is not active
    }

    // carry out action
    actions[currentAction]();

    // observe reward and new state
    reward = observeReward();
    nextState = getTrexState();

    // update weights by using next Action accoridng to policy
    nextAction = greedy(nextState);
    updateWeights(currentState, currentAction, reward, nextState, nextAction);

    currentState = nextState;
    currentAction = nextAction;

    // if we crashed, restart app but don't reset parameters ofcourse
    if (Runner.instance_.tRex.status === "CRASHED") {
        restart();
    }
};

window.setInterval(algorithm, 1000 / fps);
