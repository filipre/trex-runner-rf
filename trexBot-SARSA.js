// TODO s:
/*
- take multiple samples and average them out, before updating Q Table / Function approximate
- decrease learning rate over time
-
*/

// config
const gamma = 0.9; // discount factor
const alpha = 0.2; // learning rate
const epsilon = 0.03;
const fps = 22;

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

/*
- bias: 1
- walking: yes, no (needed?)
- jumping: yes, no
- ducking: yes, no
- speed: (Runner.instance_.currentSpeed - 6) / (13 - 6)
- distance to obstacle: (Runner.instance_.tRex.xPos - 0) / (600 - 0) ??
- yPos: (Runner.instance_.tRex.yPos - 0) / (200 - 0); ??

- smallCactus: yes, no
- bigCactus: yes, no
- flyingThingy: yes, no
- simple: yes, no
- double: yes, no
- tripple: yes, no
*/
var getTrexState = function() {
    var tRexState = {};
    // general
    tRexState.bias = 1;
    tRexState.running = (Runner.instance_.tRex.status === "RUNNING") ? 1 : 0;
    tRexState.jumping = (Runner.instance_.tRex.status === "JUMPING") ? 1 : 0;
    tRexState.ducking = (Runner.instance_.tRex.status === "DUCKING") ? 1 : 0;
    tRexState.speed = (Runner.instance_.currentSpeed - 6) / (13 - 6);
    tRexState.xPos = (Runner.instance_.tRex.xPos - 0) / (650 - 0);
    tRexState.yPos = (Runner.instance_.tRex.yPos - 0) / (200 - 0);
    // no obstacle
    tRexState.obstacle0_smallCactuls = 0;
    tRexState.obstacle0_largeCactuls = 0;
    tRexState.obstacle0_other = 0; // TODO !!
    tRexState.obstacle0_xPos = 0;
    tRexState.obstacle0_yPos = 0;
    tRexState.obstacle0_simple = 0;
    tRexState.obstacle0_double = 0;
    tRexState.obstacle0_triple = 0;
    // with 1 obstacle
    if (Runner.instance_.horizon.obstacles.length > 0) {
        tRexState.obstacle0_smallCactuls = (Runner.instance_.horizon.obstacles[0].typeConfig.type === "CACTUS_SMALL") ? 1 : 0;
        tRexState.obstacle0_largeCactuls = (Runner.instance_.horizon.obstacles[0].typeConfig.type === "CACTUS_LARGE") ? 1 : 0;
        tRexState.obstacle0_other = 0; // TODO !!
        tRexState.obstacle0_xPos = (Runner.instance_.horizon.obstacles[0].xPos - 0) / (650 - 0);
        tRexState.obstacle0_yPos = (Runner.instance_.horizon.obstacles[0].yPos - 0) / (200 - 0);
        tRexState.obstacle0_simple = (Runner.instance_.horizon.obstacles[0].size === 1) ? 1 : 0;
        tRexState.obstacle0_double = (Runner.instance_.horizon.obstacles[0].size === 2) ? 1 : 0;
        tRexState.obstacle0_triple = (Runner.instance_.horizon.obstacles[0].size === 3) ? 1 : 0;
    }
    return tRexState;
};

// [1, state.bias, state.running, state.jumping, state.ducking, state.speed, state.xPos, state.yPos, state.obstacle0_smallCactuls, state.obstacle0_largeCactuls, state.obstacle0_other, state.obstacle0_xPos, state.obstacle0_yPos, state.obstacle0_simple, state.obstacle0_double, state.obstacle0_triple, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
// [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, state.bias, state.running, state.jumping, state.ducking, state.speed, state.xPos, state.yPos, state.obstacle0_smallCactuls, state.obstacle0_largeCactuls, state.obstacle0_other, state.obstacle0_xPos, state.obstacle0_yPos, state.obstacle0_simple, state.obstacle0_double, state.obstacle0_triple, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
// [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, state.bias, state.running, state.jumping, state.ducking, state.speed, state.xPos, state.yPos, state.obstacle0_smallCactuls, state.obstacle0_largeCactuls, state.obstacle0_other, state.obstacle0_xPos, state.obstacle0_yPos, state.obstacle0_simple, state.obstacle0_double, state.obstacle0_triple];

// Our basis functions: F_i
var features = function(state, action) {
    switch(action) {
        case "noop":
            return [state.bias, state.running, state.jumping, state.ducking, state.speed, state.xPos, state.yPos, state.obstacle0_smallCactuls, state.obstacle0_largeCactuls, state.obstacle0_other, state.obstacle0_xPos, state.obstacle0_yPos, state.obstacle0_simple, state.obstacle0_double, state.obstacle0_triple, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        case "jump":
            return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, state.bias, state.running, state.jumping, state.ducking, state.speed, state.xPos, state.yPos, state.obstacle0_smallCactuls, state.obstacle0_largeCactuls, state.obstacle0_other, state.obstacle0_xPos, state.obstacle0_yPos, state.obstacle0_simple, state.obstacle0_double, state.obstacle0_triple, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        case "duck":
            return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, state.bias, state.running, state.jumping, state.ducking, state.speed, state.xPos, state.yPos, state.obstacle0_smallCactuls, state.obstacle0_largeCactuls, state.obstacle0_other, state.obstacle0_xPos, state.obstacle0_yPos, state.obstacle0_simple, state.obstacle0_double, state.obstacle0_triple];
    }
};

// learnable parameters w_i, initialized to zero
var weights = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

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
        var randomAction = Object.keys(actions)[randomNumber(0, Object.keys(actions).length-1)];
        //console.log(randomAction);
        return randomAction;
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
    if (Runner.instance_.playing === false && Runner.instance_.crashed !== true) {
        return; // don't start yet, window is not active
    }

    // carry out action
    actions[currentAction]();

    // observe reward and new state
    reward = observeReward();
    nextState = getTrexState();

    // update weights by using next Action based on policy
    nextAction = epsGreedy(nextState);
    updateWeights(currentState, currentAction, reward, nextState, nextAction);

    currentState = nextState;
    currentAction = nextAction;

    // if we crashed, restart app but don't reset parameters ofcourse
    if (Runner.instance_.tRex.status === "CRASHED") {
        restart();
    }
};
window.setInterval(algorithm, 1000 / fps);

var getStatus = function() {
    console.log(weights);
};
window.setInterval(getStatus, 5000);
