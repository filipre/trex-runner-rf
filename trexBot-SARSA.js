// TODO s:
/*
- take multiple samples and average them out, before updating Q Table / Function approximate
- decrease learning rate over time
-
*/

// config
var gamma = 0.9; // discount factor
var alpha = 0.05; // learning rate
var epsilon = 0.01;
var fps = 30;

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

// 3 Actions: do nothing, jump or duck
var actions = {
    "noop": noop,
    "jump": jump,
    "duck": duck
};

var restart = function() {
    Runner.instance_.restart();
    Runner.instance_.tRex.xPos = 0;
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
    tRexState.jumping = (Runner.instance_.tRex.status === "JUMPING") ? 1 : 0;
    tRexState.ducking = (Runner.instance_.tRex.status === "DUCKING") ? 1 : 0;
    tRexState.speed = (Runner.instance_.currentSpeed - 6) / (13 - 6);
    tRexState.yPos = (Runner.instance_.tRex.yPos - 0) / (200 - 0);
    // no obstacle
    tRexState.obstacle0_smallCactus = (-10 - -10) / (650 - -10);
    tRexState.obstacle0_largeCactus = (-10 - -10) / (650 - -10);
    // with 1 obstacle
    if (Runner.instance_.horizon.obstacles.length > 0) {
        tRexState.obstacle0_smallCactus = (Runner.instance_.horizon.obstacles[0].typeConfig.type === "CACTUS_SMALL") ? (Runner.instance_.horizon.obstacles[0].xPos - -10) / (650 - -10) : 0;
        tRexState.obstacle0_largeCactus = (Runner.instance_.horizon.obstacles[0].typeConfig.type === "CACTUS_LARGE") ? (Runner.instance_.horizon.obstacles[0].xPos - -10) / (650 - -10) : 0;
    }
    return tRexState;
};

// Our basis functions: F_i
var features = function(state, action) {
    switch(action) {
        case "noop":
            return [1, state.jumping, state.ducking, state.speed, state.yPos, state.obstacle0_smallCactus, state.obstacle0_largeCactus, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        case "jump":
            return [1, 0, 0, 0, 0, 0, 0, state.jumping, state.ducking, state.speed, state.yPos, state.obstacle0_smallCactus, state.obstacle0_largeCactus, 0, 0, 0, 0, 0, 0];
        case "duck":
            return [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, state.jumping, state.ducking, state.speed, state.yPos, state.obstacle0_smallCactus, state.obstacle0_largeCactus];
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
var updateWeights = function(state, action, target) {
    var myFeatures = features(state, action);
    for (var i=0; i<weights.length; i++) {
        weights[i] = weights[i] + (alpha * target * myFeatures[i]);
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
};

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

var currentState, currentAction, reward, nextState, nextAction, target;
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
    nextAction = epsGreedy(nextState);

    // check if terminal state or not
    if (Runner.instance_.tRex.status === "CRASHED") {
        target = -1;
        console.log(weights);
        restart(); // sample new initial state
        nextState = getTrexState();
    } else {
        target = delta(currentState, currentAction, reward, nextState, nextAction);
    }

    // update weights by using next Action based on policy
    updateWeights(currentState, currentAction, target);

    currentState = nextState;
    currentAction = nextAction;
};
window.setInterval(algorithm, 1000 / fps);
