// TODO s:
/*
- take multiple samples and average them out, before updating Q Table / Function approximate
- decrease learning rate over time
-
*/

// config
const gamma = 0.9;
const alpha = 0.1;
const epsilon = 0.1; // 0.01;

const negative_award = -1;
const fps = 10; // 30;

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
function max_array(numArray) {
  return Math.max.apply(null, numArray);
}
function min_array(numArray) {
  return Math.min.apply(null, numArray);
}
// function normalize(x, values) {
//     if (x < 0.0000001) {
//         return 0;
//     }
//     var minValue = min_array(values);
//     var maxValue = max_array(values);
//     if (maxValue - minValue < 0.0000001) {
//         return 0;
//     }
//     return (x - minValue) / (maxValue - minValue);
// }
function standardDeviation(values){
  var avg = average(values);
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });
  var avgSquareDiff = average(squareDiffs);
  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}
function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);
  var avg = sum / data.length;
  return avg;
}
function normalize(data) {
    var m = average(data);
    var d = standardDeviation(data);
    for(var i=0; i<data.length; ++i) {
        data[i] = (data[i] - m) / d;
    }
    return data;
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
var getTrexState = function() {
    var tRexState = {};
    tRexState.currentSpeed = (Runner.instance_.currentSpeed - 6) / (13 - 6);
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

// Our basis functions
var phi = function(state, action) {
    switch(action) {
        case "noop":
            return [state.currentSpeed, state.tRexXPos, state.tRexYPos, state.obstacle0XPos, state.obstacle0YPos, state.obstacle0Size, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
        case "jump":
            return [0, 0, 0, 0, 0, 0, state.currentSpeed, state.tRexXPos, state.tRexYPos, state.obstacle0XPos, state.obstacle0YPos, state.obstacle0Size, 0, 0, 0, 0, 0, 0, 1];
        case "duck":
            return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, state.currentSpeed, state.tRexXPos, state.tRexYPos, state.obstacle0XPos, state.obstacle0YPos, state.obstacle0Size, 1];
    }
};

// learnable parameters, initialized to zero
var theta = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

var Q_func = function(state, action) {
    var sum = 0;
    var phi_sa = phi(state, action);
    for(var i=0; i<theta.length; i++) {
        sum += theta[i] * phi_sa[i];
    }

    // add regularization
    var thetaSumSquared = 0;
    for(var j=0; j<theta.length; j++) {
        thetaSumSquared += theta[j]*theta[j];
    }
    sum += 1 * thetaSumSquared;

    return sum;
};

// TODO: refactor
var epsGreedy = function(state) {
    var prob = Math.random();
    if(prob <= epsilon) {
        return Object.keys(actions)[randomNumber(0, Object.keys(actions).length-1)];
    } else {
        var currentMax = Q_func(state, "noop");
        var currentMaxArg = "noop";
        if (Q_func(state, "jump") > currentMax) {
            currentMax = Q_func(state, "jump");
            currentMaxArg = "jump";
        }
        if (Q_func(state, "duck") > currentMax) {
            currentMax = Q_func(state, "duck");
            currentMaxArg = "duck";
        }
        return currentMaxArg;
    }
};

var qLearningUpdate = function(currentState, action, nextState, reward) {
    // TODO!!! currentState: s; action: a; nextState: s'; reward: R
    // old (q table):
    // target = reward + gamma * max_{a'} (Q_(nextState, a'));
    // Q_{currentState, action} = (1 - alpha) * Q_sa + alpha * target

    // new (function approximation):
    var Q_plus = reward + gamma * max_array(Object.keys(actions).map(function(action_prime) {
        return Q_func(nextState, action_prime);
    }));
    console.log(Q_plus);

    var sum = 0;
    var phi_sa = phi(currentState, action);
    for(var i=0; i<theta.length; i++) {
        sum += theta[i]*phi_sa[i];
    }
    var newTheta = [];
    for(var j=0; j<theta.length; j++) {
        //newTheta[j] = theta[j] - (alpha * (Q_plus - sum) * phi_sa[j]);
        newTheta[j] = theta[j] - (alpha * (Q_plus - sum) * phi(currentState, action)[j]);
    }
    theta = newTheta;
    console.log("new theta:", theta);
};

var currentState = getTrexState();
var nextState = getTrexState(); // not needed
var reward = 0;


// read out next state

// check if it is waiting

// calculate reward

// q learning update

// currentState = nextState

// action = ...

// perform action


var algorithm = function() {
    if (Runner.instance_.tRex.status === "WAITING") {
        return;
    }

    // sample action a
    action = epsGreedy(currentState);

    // perform it
    actions[action]();

    // get next state s'
    nextState = getTrexState();

    // calculate reward
    if (Runner.instance_.tRex.status === "CRASHED") {
        reward = -1;
    } else {
        reward = 0;
    }

    // perform approx function update
    qLearningUpdate(currentState, action, nextState, reward);

    // next State is now the current state
    currentState = nextState;

    // if we crashed, restart app
    if (Runner.instance_.tRex.status === "CRASHED") {
        restart();
    }
};

window.setInterval(algorithm, 1000 / fps);
