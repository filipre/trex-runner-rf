// config
const gamma = 0.9;
const alpha = 0.1;
const epsilon = 0.5;
const positive_award = 1;
const negative_award = -100;
const fps = 5;



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



// (status, obstacle_x, obstacle_y, obstacle_width)
var qValues = [];
// var initQValues = function() {
//     ["WAITING", "CRASHED", "RUNNING", "JUMPING", "DUCKING"].forEach(function(status) {
//         qValues[status] = {};
//         ["NOTHING", "CACTUS_SMALL", "CACTUS_LARGE", "PTERODACTYL"].forEach(function(obstacle_type) {
//             qValues[status][obstacle_type] = [];
//             for(var obstacle_x = -10; obstacle_x <= 62; ++obstacle_x) {
//                 qValues[status][obstacle_type][obstacle_x] = {};
//                 [50, 75, 90, 100, 105].forEach(function(obstacle_y) {
//                     qValues[status][obstacle_type][obstacle_x][obstacle_y] = {};
//                     [1, 2, 3, 4, 5].forEach(function(obstacle_size) {
//                         qValues[status][obstacle_type][obstacle_x][obstacle_y][obstacle_size] = [];
//                         ["duck", "jump", "noop"].forEach(function(action) {
//                             qValues[status][obstacle_type][obstacle_x][obstacle_y][obstacle_size].push(0);
//                         });
//                     });
//                 });
//             }
//         });
//     });
// };
// var initQValues = function() {
//     ["WAITING", "CRASHED", "RUNNING", "JUMPING", "DUCKING"].forEach(function(status) {
//         ["NOTHING", "CACTUS_SMALL", "CACTUS_LARGE", "PTERODACTYL"].forEach(function(obstacle_type) {
//             for(var obstacle_x = -10; obstacle_x <= 62; ++obstacle_x) {
//                 [50, 75, 90, 100, 105].forEach(function(obstacle_y) {
//                     [1, 2, 3, 4, 5].forEach(function(obstacle_size) {
//                         ["NOTHING", "CACTUS_SMALL", "CACTUS_LARGE", "PTERODACTYL"].forEach(function(obstacle2_type) {
//                             for(var obstacle2_x = -10; obstacle2_x <= 62; ++obstacle2_x) {
//                                 [50, 75, 90, 100, 105].forEach(function(obstacle2_y) {
//                                     [1, 2, 3, 4, 5].forEach(function(obstacle2_size) {
//                                         qValues[[status, obstacle_type, obstacle_x, obstacle_y, obstacle_size, obstacle2_type, obstacle2_x, obstacle2_y, obstacle2_size]] = [];
//                                         actions.forEach(function(action) {
//                                             qValues[[status, obstacle_type, obstacle_x, obstacle_y, obstacle_size, obstacle2_type, obstacle2_x, obstacle2_y, obstacle2_size]].push(0);
//                                         });
//                                     });
//                                 });
//                             }
//                         });
//                     });
//                 });
//             }
//         });
//     });
// }
var initQValues = function() {
    ["WAITING", "CRASHED", "RUNNING", "JUMPING", "DUCKING"].forEach(function(status) {
        for(var obstacle_x = -10; obstacle_x <= 30; ++obstacle_x) {
            [50, 75, 90, 100, 105].forEach(function(obstacle_y) {
                [1, 2, 3, 4].forEach(function(obstacle_size) {
                    for(var obstacle2_x = -10; obstacle2_x <= 30; ++obstacle2_x) {
                        [50, 75, 90, 100, 105].forEach(function(obstacle2_y) {
                            [1, 2, 3, 4, 5].forEach(function(obstacle2_size) {
                                qValues[[status, obstacle_x, obstacle_y, obstacle_size, obstacle2_x, obstacle2_y, obstacle2_size]] = [0, 0, 0];
                            });
                        });
                    }
                });
            });
        }
    });
};
// var getQValues = function(state) {
//     // console.log(state);
//     try {
//         return qValues[state.status][state.obstacle_type][state.obstacle_x][state.obstacle_y][state.obstacle_size];
//     } catch(e) {
//         console.log(state);
//         return;
//     }
//
// };
var getQValues = function(state) {
    // console.log(state);
    return qValues[[state.status, state.obstacle_x, state.obstacle_y, state.obstacle_size, state.obstacle2_x, state.obstacle2_y, state.obstacle2_size]];
};
// var setQValue = function(state, action, value) {
//     qValues[state.status][state.obstacle_type][state.obstacle_x][state.obstacle_y][state.obstacle_size][action] = value;
// };
var setQValue = function(state, action, value) {
    qValues[[state.status, state.obstacle_x, state.obstacle_y, state.obstacle_size, state.obstacle2_x, state.obstacle2_y, state.obstacle2_size]][action] = value;
};

var getStateFromTrex = function() {
    if (Runner.instance_.horizon.obstacles.length >= 2) {
        var xPos = Math.floor(Runner.instance_.horizon.obstacles[0].xPos / 10.0);
        var xPos2 = Math.floor(Runner.instance_.horizon.obstacles[1].xPos / 10.0);
        return {
            "status": Runner.instance_.tRex.status,
            "obstacle_x": (xPos > 30) ? 30 : xPos,
            "obstacle_y": Runner.instance_.horizon.obstacles[0].yPos,
            "obstacle_size":  Runner.instance_.horizon.obstacles[0].size,
            "obstacle2_x": (xPos2 > 30) ? 30 : xPos2,
            "obstacle2_y": Runner.instance_.horizon.obstacles[1].yPos,
            "obstacle2_size":  Runner.instance_.horizon.obstacles[1].size,
        };
    } else if (Runner.instance_.horizon.obstacles.length === 1) {
        var xPos = Math.floor(Runner.instance_.horizon.obstacles[0].xPos / 10.0);
        return {
            "status": Runner.instance_.tRex.status,
            "obstacle_x": (xPos > 30) ? 30 : xPos,
            "obstacle_y": Runner.instance_.horizon.obstacles[0].yPos,
            "obstacle_size":  Runner.instance_.horizon.obstacles[0].size,
            "obstacle2_x": -10,
            "obstacle2_y": 50,
            "obstacle2_size": 1,
        };
    } else {
        return {
            "status": Runner.instance_.tRex.status,
            "obstacle_x": -10,
            "obstacle_y": 50,
            "obstacle_size": 1,
            "obstacle2_x": -10,
            "obstacle2_y": 50,
            "obstacle2_size": 1,
        };
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
    // console.log(reward)
    var targetNextState = reward + gamma * getMaxOfArray(["duck", "jump", "noop"].map(function(actionName, actionIndex) {
        return getQValues(nextState)[actionIndex];
    }));
    setQValue(currentState, action, (1 - alpha) * getQValues(currentState)[action] + alpha * targetNextState);
    // console.log(getQValues(currentState));
};



// BOT!!!!

initQValues();


// for itr in range(300000):
//     # YOUR CODE HERE
//     # Hint: use eps_greedy & q_learning_update
//
//     action = eps_greedy(q_vals, eps, cur_state)
//     next_state, reward, done, info = env.step(action)
//     q_learning_update(gamma, alpha, q_vals, cur_state, action, next_state, reward)
//     cur_state = next_state

var currentState = getStateFromTrex();;
var nextState;
var action = 0; //noop

var iteration = 1;
var intervalID;

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
        Runner.instance_.restart();
    }
};

var testRun = function() {
    var state = getStateFromTrex();
    if (state.status === "WAITING") {
        return;
    }
    if (state.status === "CRASHED") {
        window.clearInterval(intervalID);
        intervalID = window.setInterval(runBot, 1000 / fps);
        Runner.instance_.restart();
    }
    action = greedy(state);
    actions[action]();
};

intervalID = window.setInterval(runBot, 1000 / fps);




// def eps_greedy(q_vals, eps, state):
//     """
//     Inputs:
//         q_vals: q value tables
//         eps: epsilon
//         state: current state
//     Outputs:
//         random action with probability of eps; argmax Q(s, .) with probability of (1-eps)
//     """
//     # you might want to use random.random() to implement random exploration
//     #   number of actions can be read off from len(q_vals[state])
//     import random
//     # YOUR CODE HERE
//     prob = random.random()
//     if prob <= eps:
//         # random action
//         return random.randint(0, 3)
//     else:
//         # greedy here
//         return np.argmax(q_vals[state
// def q_learning_update(gamma, alpha, q_vals, cur_state, action, next_state, reward):
//     """
//     Inputs:
//         gamma: discount factor
//         alpha: learning rate
//         q_vals: q value table
//         cur_state: current state
//         action: action taken in current state
//         next_state: next state results from taking `action` in `cur_state`
//         reward: reward received from this transition
//
//     Performs in-place update of q_vals table to implement one step of Q-learning
//     """
//     target_next_state = reward + gamma * np.max([q_vals[next_state][next_action] for next_action in range(0, 4)])
//     q_vals[cur_state][action] = (1 - alpha) * q_vals[cur_state][action] + alpha * target_next_state
