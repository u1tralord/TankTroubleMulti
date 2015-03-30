var socketio = require('socket.io');
var http = require('http');
var express = require('express');
var fs = require('fs');
var path = require('path');

var router = express();
router.use(express.static(path.resolve(__dirname, 'client')));
var server = http.createServer(router);

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var io = socketio.listen(server);

var tanks = [];

io.sockets.on('connection', function (socket) {
  console.log('Client Connected! ['+getNewID()+']');
  
  var tank = getNewTank(config.startPos.x, config.startPos.y, config.startPos.dir, socket);
  tanks.push(tank);
  socket.emit('identify', {id: tank.id});
  
  socket.on('tankPosUpdate', function(data) {
    tank.xPos = data.xPos;
    tank.yPos = data.yPos;
    tank.dir = data.dir
  });
  
  socket.on('shoot', function(data) {
      tank.shoot();
  });
  
  socket.on('disconnect', function() {
    tanks.splice(tanks.indexOf(tank),1);//remove that tank from the world
    console.log('Client Disconnected!');
  });
});

console.log("Server started");

setInterval(function() {
  mainThread();
}, 1000 / config.updateRate);

setInterval(function() {
  pingThread();
}, 1000 / config.pingRate);

function mainThread(){
    tanks.forEach(function(tank) {
        tank.bullets.forEach(function(bullet) {
            bullet.update();
        })
    })
}

function pingThread(){
    var tankData = [];
    
    tanks.forEach(function(tank) {
		tankData.push(tank.getPacketData());
    });
	
	tanks.forEach(function(tank) {
	    tank.socket.emit('updateTanks', tankData);
	});
}

function broadcast(eventName, eventData){
    tanks.forEach(function(tank) {
       tank.socket.emit(eventName, eventData); 
    });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});

function getNewID(){
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function getNewTank(x, y, dir, socket){
    var I = {};
    I.id = getNewID();
    I.xPos = x;
    I.yPos = y;
    I.dir = dir;
    I.socket = socket;
    I.score = 0;
    I.bullets = [];
    I.maxBullets = 11111111111111111;
    I.width=40;
    I.height=30;
    
    I.velocity = 0;
    I.maxVelocity = 10;
    
    I.shoot = function () {
        var canShoot = true;
		
		if(this.bullets.length > 0){
			//console.log(getDistanceBetween(this.x, this.y, lastBullet.x, lastBullet.y));
			var lastBullet = this.bullets[this.bullets.length-1];
			canShoot = lastBullet.distanceTraveled > 40 && this.bullets.length < this.maxBullets;
		}
				
		if(canShoot){
		    var bulletX = this.centerpoint().x;
		    var bulletY = this.centerpoint().y;
		    var newBullet = Bullet(bulletX, bulletY, this.dir);
			this.bullets.push(newBullet);
			
			broadcast('newBullet', {
			    xPos: bulletX,
			    yPos: bulletY,
			    dir: this.dir
			});
			console.log('['+this.id+'] Shoots');
			//console.log("["+this.id+"]SHOOTING!");
		}
		else{
		    //console.log("TOO FAST!");
		    //console.log(this.bullets.length +" "+ this.maxBullets);
		}
    }
    
    I.centerpoint = function() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }
    
    I.setVelocity = function(){
        this.velocity = this.velocity.clamp(-1*this.maxVelocity, this.maxVelocity);
    }
    
    I.getPacketData = function(){
        return {
          id: this.id,
          xPos: this.xPos,
          yPos: this.yPos,
          dir: this.dir,
        };
    }
    
    I.die = function(){
        //TODO
    }
    
    return I;
}

function Bullet(_x, _y, _dir) {
    var I = {};
    I.active = true;
    I.color = "#000000";
    I.size = 10;
    I.x = _x;
    I.y = _y;
	I.direction = _dir;
	I.velocity = 4;
	I.distanceTraveled = 0;
	I.maxTravelDistance = 1000;
	
	I.update = function(){
		this.move();
		this.distanceTraveled+=this.velocity;
		if (this.distanceTraveled > this.maxTravelDistance)
			this.active = false;
	}
	
	I.bounce = function() {
	    //TODO
	}

    I.centerpoint = function() {
        return {
            x: this.x + this.size / 2,
            y: this.y + this.size / 2
        };
    }

    I.move = function() {
        this.x += this.yVelocity * Math.cos(this.direction * Math.PI / 180);
		this.y += this.yVelocity * Math.sin(this.direction * Math.PI / 180);
    }
    
    I.die = function(){
        //TODO
    }
    
    I.getPacketData = function() {
        return {
          xPos: this.x,
          yPos: this.y,
          dir: this.direction
        };
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
	
	I.set = function(I){
        I.vX = this.vY;
        I.vY = this.vY;
		I.dir = this.dir;
        I.mag = this.mag;
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
}

function checkBulletCollision(bullet,tank){//returns if there is a collision
    var bCenter = bullet.centerpoint();
    var tCenter = tank.centerpoint();
    var vector = Vector(bCenter.x,bCenter.y,tCenter.x,tCenter.y);
    var bVector = vector.setMagnitude(bullet.size);
    var tankMag = Vector(0,0,tank.width,tank.height).mag;
    var tankDisX = tankMag * Math.cos(180+tank.dir);
    var tankDisY = tankMag * Math.sin(tank.dir);
     return (vector.vX<tankDisX+bVector.Vx && vector.vY<tankDisY+bVector.Vy);
    
}