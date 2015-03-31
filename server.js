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
      tank.shoot(data.xPos, data.yPos);
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
            tanks.forEach(function(tank1) {
                if(!tank1.dead && checkBulletCollision(bullet, tank1)){
                    tank1.die();
                    broadcast('tankDeath', {id: tank1.id});
                    bullet.active = false;
                }
            });
        });
    });
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
    var t = {};
    t.id = getNewID();
    t.xPos = x;
    t.yPos = y;
    t.dir = dir;
    t.socket = socket;
    t.score = 0;
    t.bullets = [];
    t.maxBullets = 11111111111111111;
    t.width=40;
    t.height=30;
    
    t.velocity = 0;
    t.maxVelocity = 10;
    
    t.dead=false;
    
    t.shoot = function (bulletX, bulletY) {
        var canShoot = true;
		
		if(t.bullets.length > 0){
			//console.log(getDistanceBetween(t.x, t.y, lastBullet.x, lastBullet.y));
			var lastBullet = t.bullets[t.bullets.length-1];
			canShoot = lastBullet.distanceTraveled > 40 && t.bullets.length < t.maxBullets;
		}
				
		if(canShoot){
		    //var bulletX = t.centerpoint().x;
		    //var bulletY = t.centerpoint().y;
		    var newBullet = Bullet(bulletX, bulletY, t.dir);
			t.bullets.push(newBullet);
			
			broadcast('newBullet', {
			    xPos: bulletX,
			    yPos: bulletY,
			    dir: t.dir
			});
			//console.log('['+t.id+'] Shoots');
			//console.log("["+t.id+"]SHOOTING!");
		}
		else{
		    //console.log("TOO FAST!");
		    //console.log(t.bullets.length +" "+ t.maxBullets);
		}
    }
    
    t.centerpoint = function() {
        return {
            x: t.xPos + t.width / 2,
            y: t.yPos + t.height / 2
        };
    }
    
    t.setVelocity = function(){
        t.velocity = t.velocity.clamp(-1*t.maxVelocity, t.maxVelocity);
    }
    
    t.getPacketData = function(){
        return {
          id: t.id,
          xPos: t.xPos,
          yPos: t.yPos,
          dir: t.dir,
        };
    }
    
    t.die = function(){
       t.dead=true;
    }
    
    return t;
}

function Bullet(_x, _y, _dir) {
    var bt = {};
    bt.active = true;
    bt.color = "#000000";
    bt.size = 10;
    bt.x = _x;
    bt.y = _y;
	bt.direction = _dir;
	bt.velocity = 4;
	bt.distanceTraveled = 0;
	bt.maxTravelDistance = 1000;
	
	bt.update = function(){
		bt.move();
		bt.distanceTraveled+=bt.velocity;
		if (bt.distanceTraveled > bt.maxTravelDistance)
			bt.active = false;
	}
	
	bt.bounce = function() {
	    if(bt.x<=0 || bt.y<=0 || bt.x>=config.canvas.width || bt.y>=config.canvas.height){
	        if(bt.direction>=180){
	            bt.direction-=180;
	        }else{
	            bt.direction+=180;
	        }
	    }
	}

    bt.centerpoint = function() {
        return {
            x: bt.x + bt.size / 2,
            y: bt.y + bt.size / 2
        };
    }

    bt.move = function() {
        bt.bounce();
        bt.x += bt.velocity * Math.cos(bt.direction * Math.PI / 180);
		bt.y += bt.velocity * Math.sin(bt.direction * Math.PI / 180);
    }
    
    bt.die = function(){
        //TODO
    }
    
    bt.getPacketData = function() {
        return {
          xPos: bt.x,
          yPos: bt.y,
          dir: bt.direction
        };
    }

    return bt;
};

function Vector2(dir, mag) {
	return Vector(0, 0, mag * Math.cos(dir * (Math.PI/180)), mag * Math.sin(dir * (Math.PI/180)));
};

function Vector(_x1, _y1, _x2, _y2) {
    var v = {};
	v.vX = _x2 - _x1;
	v.vY = _y2 - _y1;
	
	v.getAngle = function (){
		var inRads = Math.atan2(v.vX, v.vY);
		/*if(inRads < 0)
			inRads = 2*Math.PI + inRads;*/
		return inRads * (180/Math.PI);
	}

	v.getMagnitude = function(){
		return Math.sqrt(Math.pow(v.vX, 2) + Math.pow(v.vY, 2));
	}
	
	v.dir = v.getAngle();
	v.mag = v.getMagnitude();
	
	v.set = function(I){
        v.vX = I.vY;
        v.vY = I.vY;
		v.dir = I.dir;
        v.mag = I.mag;
    }
	
	v.unitVector = function() {
        return Vector(0, 0, v.vX/v.mag, v.vY/v.mag);
    }
	
	v.divide = function(scalar) {
        return Vector(0, 0, v.vX/scalar, v.vY/scalar);
    }
	
	v.mulitply = function(scalar) {
        return Vector(0, 0, v.vX*scalar, v.vY*scalar);
    }
	
	v.sum = function(vect) {
        return Vector(0, 0, v.vX+vect.vX, v.vY+vect.vY);
    }

    v.diff = function(vect) {
        return Vector(0, 0, v.vX-vect.vX, v.vY-vect.vY);
    }

    v.rotate = function(degrees) {
        return Vector2(v.dir+degrees, v.mag);
    }

    v.setDir = function(degrees) {
        return Vector2(v.degrees, v.mag);
    }
	
	v.setMagnitude = function(_mag){
        v.mag = _mag;
        v.vX = Math.cos(v.dir * (Math.PI/180)) * v.mag;
        v.vY = Math.sin(v.dir * (Math.PI/180)) * v.mag;

    }

    v.equals = function(vect){
        return v.vX == vect.vX && v.vY == vect.vY;
    }
	
	return v;
}
9
function checkBulletCollision(bullet,tank){//returns if there is a collision
    var bCenter = bullet.centerpoint();
    var tCenter = tank.centerpoint();
    var vector = Vector(bCenter.x,bCenter.y,tCenter.x,tCenter.y);
    var bVector = Vector(bCenter.x,bCenter.y,tCenter.x,tCenter.y); bVector.setMagnitude(bullet.size);
    var tankMag = Vector(0,0,tank.width,tank.height).mag;
    var tankDisX = Math.abs(tankMag * Math.cos(180+tank.dir));
    var tankDisY = Math.abs(tankMag * Math.sin(tank.dir));
    //console.log((vector.vX-(tankDisX+bVector.vX))+","+(vector.vY-(tankDisY+bVector.vY)));
    return (vector.vX<tankDisX+bVector.vX && vector.vY<tankDisY+bVector.vY);
    
}