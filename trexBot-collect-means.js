function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function calcMean(myArray) {
    var sum = 0;
    myArray.forEach(function(element) {
        sum = sum + element;
    });
    return sum / myArray.length;
}

function calcVariance(myArray) {
    var sum = 0;
    var avg = calcMean(myArray);
    myArray.forEach(function(element) {
        var term = element - avg;
        sum = sum + (term * term);
    });
    return sum / (myArray.length - 1);
}

function print() {
    console.log("speed: ", calcMean(speed), Math.sqrt(calcVariance(speed)));
    console.log("yPos: ", calcMean(yPos), Math.sqrt(calcVariance(yPos)));
    console.log("obstacleXPos: ", calcMean(obstacleXPos), Math.sqrt(calcVariance(obstacleXPos)));
}

var fps = 15;

var speed = [];
var yPos = [];
var obstacleXPos = [];


async function algorithm() {
    while(true) {
        await sleep(1000 / fps);

        if (Runner.instance_.playing === false && Runner.instance_.crashed === false) {
            continue; // don't start yet, window is not active
        }

        if (Runner.instance_.crashed === true) {
            continue;
        }

        speed.push(Runner.instance_.currentSpeed);
        yPos.push(Runner.instance_.tRex.yPos);
        if (Runner.instance_.horizon.obstacles.length > 0) {
            obstacleXPos.push(Runner.instance_.horizon.obstacles[0].xPos);
        }
    }
}

algorithm();
