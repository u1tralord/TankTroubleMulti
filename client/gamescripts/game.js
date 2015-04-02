var myID = 0;
// socket = io.connect("https://tanktroublemultiplayer-u1tralord.c9.io/");
var socket = io();

var lastUpdateTime = 0;
socket.on("identify", function(data) {
    myID = data.id;
    lastUpdateTime = Date.now();
    running = true;
});

var enemyTanks = [];
var serverBullets = [];

var deadTanks = [];

socket.on("updateTanks", function(data) {
    enemyTanks = data;
    
    /*
    var serverBullets0 = [];
    enemyTanks.forEach(function(enemy) {
        enemy.bullets.forEach(function(enemyBullet){
            enemyBullet.color = "#00f";
            serverBullets0.push(enemyBullet);
        });
    });
    serverBullets = serverBullets0;
    */
});

socket.on("newBullet", function(dataBullet) {
    var serverBullet = Bullet(dataBullet.xPos, dataBullet.yPos, dataBullet.dir);
    serverBullet.color = "#00f";
    serverBullets.push(serverBullet);
});

socket.on('tankDeath', function(data) {
   if(data.id == myID){
    console.log("Ya Got Shot!");
    console.log('shot');
    deadTanks.push(data.id);
   }
    
});

socket.on('tankSpawn', function(data) {
    if(data.id == myID)
        console.log("You're alive!");
});

var CANVAS_WIDTH = 720;
var CANVAS_HEIGHT = 480;
var FPS = 60;
var pingRate = 35;
var updateRate = 60;
var running = false;
var gameOverBool = false;
var shadowAlpha = 0.1;

var canvasElement = $("<canvas width='" + CANVAS_WIDTH +
    "' height='" + CANVAS_HEIGHT + "'></canvas>");
var canvas = canvasElement.get(0).getContext("2d");
canvasElement.appendTo(document.getElementById("game"));

setInterval(function() {
    if (running) {
        update();
    }
}, 1000 / updateRate);

var lastPos = {xPos: 0, yPos: 0, dir: 0};
setInterval(function() {
    if (running) {
        var newPos = {xPos: player.x, yPos: player.y, dir: player.dir};
        if(newPos != lastPos)
            socket.emit('tankPosUpdate', newPos);
            
        lastPos = newPos;
    }
}, 1000 / pingRate);

setInterval(function() {
    if (running) {
        draw();
    }
}, 1000 / FPS);

setInterval(function() {
    if (keydown.space && !running){
			reset();
	}
	if(keydown.p && !gameOverBool){
		running = !running;
	}
}, 100);


function getNewID(){
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

var player = {
	bullets: [],
    color: "#508494",
    width: 40,
    height: 30,
	dir: 270,
    x: CANVAS_WIDTH / 2 - 10,
    y: (CANVAS_HEIGHT / 2),
    xVelocity: 0.0,
    yVelocity: 0.0,
    maxXSpeed: 10,
    maxYSpeed: 4,
	maxBullets: 5,
	v1: {dir: 270, mag: 0},
    id: 0,
	
    draw: function() {
		canvas.translate( this.midpoint().x, this.midpoint().y );
		canvas.rotate(this.dir * Math.PI / 180);
		
        canvas.fillStyle = this.color;
		canvas.fillRect(-1*this.width/2, -1*this.height/2, this.width, this.height);
		canvas.fillStyle = "#000";
        canvas.rect(-1*this.width/2, -1*this.height/2, this.width, this.height);
        
        canvas.fillStyle = this.color;
        canvas.fillRect(-1*this.width/2+20, -1*this.height/2+10, 25, 10);
        canvas.fillStyle = "#000";
        canvas.rect(-1*this.width/2+20, -1*this.height/2+10, 25, 10);
	    //Draw Shadow Code:
		//Uncomment to enable shadow for player
		/*canvas.globalAlpha = shadowAlpha;
		for(i=0; i < 5; i++){
			canvas.fillRect(this.x+i, this.y+i, this.width, this.height);
		}
		this.sprite = Sprite("player");
		this.sprite.draw(canvas, this.x, this.y);
		canvas.globalAlpha = 1;
		*/
		
		canvas.rotate(-1*this.dir * Math.PI / 180);
		canvas.translate( -1*this.midpoint().x, -1*this.midpoint().y );
		canvas.restore();
    },

    move: function() {
        /*this.xVelocity = this.xVelocity.clamp(0 - this.maxXSpeed, this.maxXSpeed);
        this.yVelocity = this.yVelocity.clamp(0 - this.maxYSpeed, this.maxYSpeed);
		
        this.x += this.xVelocity;
        this.y += this.yVelocity;
        this.x = this.x.clamp(0, CANVAS_WIDTH - this.width);
        this.y = this.y.clamp(0, CANVAS_HEIGHT - this.height);*/
		
		this.x += this.yVelocity * Math.cos(this.dir * Math.PI / 180);
		this.y += this.yVelocity * Math.sin(this.dir * Math.PI / 180);
		this.x = this.x.clamp(0, CANVAS_WIDTH - this.width);
        this.y = this.y.clamp(0, CANVAS_HEIGHT - this.height);
    },
	
	shoot: function() {
		
		var canShoot = true;
		
		if(this.bullets.length > 0){
			//console.log(getDistanceBetween(this.x, this.y, lastBullet.x, lastBullet.y));
			var lastBullet = this.bullets[this.bullets.length-1];
			canShoot = lastBullet.distanceTraveled > 40 && 
			this.bullets.length < this.maxBullets;
		}
				
		if(canShoot){
			//this.bullets.push(Bullet(this.midpoint().x, this.midoint().y, this.dir));
			socket.emit('shoot', { 
			    id: getNewID(),
                xPos: this.midpoint().x,
                yPos: this.midpoint().y,
                dir: this.dir
            });
		}
	},

    midpoint: function() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }
};

function drawTank(tank){
    tank.width = 40;
    tank.height = 30;
    
    tank.centerX = tank.xPos + tank.width/2;
    tank.centerY = tank.yPos + tank.height/2;
    
    canvas.translate( tank.centerX, tank.centerY );
	canvas.rotate(tank.dir * Math.PI / 180);
	
    canvas.fillStyle = "#ff0000";
	canvas.fillRect(-1*tank.width/2, -1*tank.height/2, tank.width, tank.height);
    canvas.fillRect(-1*tank.width/2+20, -1*tank.height/2+10, 25, 10);
	
	canvas.rotate(-1*tank.dir * Math.PI / 180);
	canvas.translate( -1*tank.centerX, -1*tank.centerY );
	canvas.restore();
}

function Bullet(_x, _y, _dir) {
    var I = {};
    I.active = true;
    I.color = "#000000";
    I.size = 10;
    I.x = _x;
    I.y = _y;
	I.direction = _dir;
	I.yVelocity = 4;
	I.distanceTraveled = 0;
	I.maxTravelDistance = 1000;
	
	I.update = function(timeDifference){
		this.distanceTraveled+=this.yVelocity;
		
		if (this.distanceTraveled > this.maxTravelDistance)
			this.active = false;
		
		if(this.x < 0 || this.x > CANVAS_WIDTH || this.y < 0 || this.y > CANVAS_HEIGHT)
			this.bounce();
			
		this.move();
	}
		I.bounce = function() {
	    if(I.x<=0 || I.y<=0 || I.x>=CANVAS_WIDTH || I.y>=CANVAS_HEIGHT){
	        if(I.direction>=180){
	            I.direction-=180;
	        }else{
	            I.direction+=180;
	        }
	    }
	}
	
	
    I.draw = function() {
        canvas.fillStyle = this.color;
        canvas.beginPath();
		canvas.arc(this.x, this.y, this.size/2, 0, 2 * Math.PI, false);
		canvas.fillStyle = this.color;
		canvas.fill();
		
		/*canvas.globalAlpha = shadowAlpha;
		for(i=0; i < 5; i++){
			canvas.fillRect(this.x+i, this.y+i, this.width, this.height);
		}
		canvas.globalAlpha = 1;
		*/
    }

    I.midpoint = function() {
        return {
            x: this.x + this.size / 2,
            y: this.y + this.size / 2
        };
    }

    I.move = function() {
        this.x += this.yVelocity * Math.cos(this.direction * Math.PI / 180);
		this.y += this.yVelocity * Math.sin(this.direction * Math.PI / 180);
    }

    return I;
};

function Vector2(dir, mag) {
	return Vector(0, 0, mag * Math.cos(dir * (Math.PI/180)), mag * Math.sin(dir * (Math.PI/180)));
};

function Vector(_x1, _y1, _x2, _y2) {
    var I = {};
	I.vX = _x2 - _x1;
	I.vY = _y2 - _y1;
	I.dir = this.getAngle();
	I.mag = this.getMagnitude();
	
	I.getAngle = function (){
		var inRads = Math.atan2(this.vX, this.vY);
		/*if(inRads < 0)
			inRads = 2*Math.PI + inRads;*/
		return inRads * (180/Math.PI);
	}

	I.getMagnitude = function(){
		return Math.sqrt(Math.pow(this.vX, 2) + Math.pow(this.vY, 2));
	}
	
	I.set = function(newVec){
        newVec.X = this.vY;
        newVec.vY = this.vY;
		newVec.dir = this.dir;
        newVec.mag = this.mag;
    }
	
	I.unitVector = function() {
        return Vector(0, 0, this.vX/this.mag, this.vY/this.mag);
    }
	
	I.divide = function(scalar) {
        return Vector(0, 0, this.vX/scalar, this.vY/scalar);
    }
	
	I.mulitply = function(scalar) {
        return Vector(0, 0, this.vX*scalar, this.vY*scalar);
    }
	
	I.sum = function(vect) {
        return Vector(0, 0, this.vX+vect.vX, this.vY+vect.vY);
    }

    I.diff = function(vect) {
        return Vector(0, 0, this.vX-vect.vX, this.vY-vect.vY);
    }

    I.rotate = function(degrees) {
        return Vector2(this.dir+degrees, this.mag);
    }

    I.setDir = function(degrees) {
        return Vector2(this.degrees, this.mag);
    }
	
	I.setMagnitude = function(_mag){
        this.mag = _mag;
        this.vX = Math.cos(this.dir * (Math.PI/180)) * this.mag;
        this.vY = Math.sin(this.dir * (Math.PI/180)) * this.mag;

    }

    I.equals = function(vect){
        return this.vX == vect.vX && this.vY == vect.vY;
    }
	
	return I;
};




function line(p1, p2, p3, p4) {
    return {
        x1: p1,
        y1: p2,
        x2: p3,
        y2: p4
    };
}

function rectangle(rx, ry, rw, rh) {
    return {
        x1: rx,
        y1: ry,
        x2: rx + rw,
        y2: ry,
        x3: rx,
        y3: ry + rh,
        x4: rx + rw,
        y4: ry + rh,
    };
}

function lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    var x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
    var y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
    if (isNaN(x) || isNaN(y)) {
        return false;
    } else {
        if (x1 >= x2) {
            if (!(x2 <= x && x <= x1)) {
                return false;
            }
        } else {
            if (!(x1 <= x && x <= x2)) {
                return false;
            }
        }
        if (y1 >= y2) {
            if (!(y2 <= y && y <= y1)) {
                return false;
            }
        } else {
            if (!(y1 <= y && y <= y2)) {
                return false;
            }
        }
        if (x3 >= x4) {
            if (!(x4 <= x && x <= x3)) {
                return false;
            }
        } else {
            if (!(x3 <= x && x <= x4)) {
                return false;
            }
        }
        if (y3 >= y4) {
            if (!(y4 <= y && y <= y3)) {
                return false;
            }
        } else {
            if (!(y3 <= y && y <= y4)) {
                return false;
            }
        }
    }
    return true;
}

function isIntersecting(rect, line) {
    var intersect = false;
    if (lineIntersect(rect.x1, rect.y1, rect.x2, rect.y2, line.x1, line.y1, line.x2, line.y2))
        intersect = true;
    if (lineIntersect(rect.x2, rect.y2, rect.x3, rect.y3, line.x1, line.y1, line.x2, line.y2))
        intersect = true;
    if (lineIntersect(rect.x3, rect.y3, rect.x4, rect.y4, line.x1, line.y1, line.x2, line.y2))
        intersect = true;
    if (lineIntersect(rect.x4, rect.y4, rect.x1, rect.y1, line.x1, line.y1, line.x2, line.y2))
        intersect = true;
    return intersect;
}

function drawRay(ray) {
    canvas.beginPath();
    canvas.moveTo(ray.x1, ray.y1);
    canvas.lineTo(ray.x2, ray.y2);
    canvas.stroke();
}

function getDistanceBetween(_x1, _y1, _x2, _y2) {
	var xDiffPow = Math.pow(_x1-_x2, 2);
	var yDiffPow = Math.pow(_y1-_y2, 2);
	return Math.sqrt(xDiffPow + yDiffPow);
}

function update() {
	//console.log(player.bullets.length);
	
    if (keydown.right || keydown.d) {
        //player.xVelocity += 1.3;
		player.dir += 5;
		player.dir = player.dir % 360;
    }
    if (keydown.left || keydown.a) {
        //player.xVelocity -= 1.3;
		player.dir -= 5;
		player.dir = player.dir % 360;
    }
    if (keydown.up || keydown.w) {
        player.yVelocity += 1.3;
        player.yVelocity = player.yVelocity.clamp(-1*player.maxYSpeed, player.maxYSpeed);
    }
	if (keydown.down || keydown.s) {
        player.yVelocity -= 1.3;
		player.yVelocity = player.yVelocity.clamp(-1*player.maxYSpeed, player.maxYSpeed);
    }

    if (keydown.space) {
        player.shoot();
    }
	if (keydown.x) {
		player.bullets.forEach(function(bullet) {
			console.log(bullet.x + "," + bullet.y);
		});
    }
    player.move();
	updateBullets();
    handleFriction();
    handleCollisions();
    
    lastUpdateTime = Date.now();
}

function updateBullets() {
	player.bullets = player.bullets.filter(function(bullet) {
        return bullet.active;
    });
	
	player.bullets.forEach(function(bullet) {
        bullet.update(0);
    });
    
     serverBullets = serverBullets.filter(function(bullet) {
        return bullet.active;
    });
	
	serverBullets.forEach(function(bullet) {
        bullet.update(0);
    });
}

function draw() {
    canvas.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.fillStyle = "#ffddc7";
    canvas.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    canvas.fillStyle = "black";
    canvas.font = "30px Arial";
	
	player.bullets.forEach(function(bullet) {
        bullet.draw();
    });
    
    serverBullets.forEach(function(bullet) {
        bullet.draw();
    });
    
    enemyTanks.forEach(function(enemy) {
        if(enemy.id != myID)
            drawTank(enemy);
    });
	
	player.draw();
}

function handleFriction() {
    var friction = 1.0;
    if (Math.abs(player.xVelocity) <= friction) {
        player.xVelocity = 0;
    } else {
        if (player.xVelocity > 0)
            player.xVelocity -= friction;
        if (player.xVelocity < 0)
            player.xVelocity += friction;
    }

    if (Math.abs(player.yVelocity) <= friction) {
        player.yVelocity = 0;
    } else {
        if (player.yVelocity > 0)
            player.yVelocity -= friction;
        if (player.yVelocity < 0)
            player.yVelocity += friction;
    }
}

function collides(a, b) {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
}

function handleCollisions() {
    
}

function reset() {
	player.x = CANVAS_WIDTH / 2 - 10;
	player.y = CANVAS_HEIGHT/2;
	distance0 = 0;
	running = true;
}

function gameOver() {
	running = false;
	var gameOverWidth = 200;
	var gameOverHeight = 100;
	var gameOverX = CANVAS_WIDTH/2 - (gameOverWidth/2);
	var gameOverY = 50;
	canvas.fillStyle = "#52B3D9";
    //canvas.fillRect(gameOverX, gameOverY, gameOverWidth, gameOverHeight);
	canvas.fillStyle = "#34495E";
	canvas.font = "30px Arial";
	//canvas.fillText("Game Over!", gameOverX+18, gameOverY+35);
	canvas.font = "10px Arial";
	//canvas.fillText("Press 'space' to try again", gameOverX+40, gameOverY+90);
}
