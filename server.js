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

io.sockets.on('connection', function (socket) {
    
    
  socket.on('disconnect', function() {
      console.log('Got disconnect!');
   });
});

console.log("Server started");

/*setInterval(function() {
    update();
}, 1000 / config.updateRate);

function update(){

}*/

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});