var publicdir = __dirname + '/client';

var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

var fs = require('fs');
var mkpath = require('mkpath');
var moment = require('moment-timezone');


//////////////////////
//BEGIN HTTPS CONFIG
//////////////////////
var https = null;
var useHttps = false;

if(process.env.SECURE_PORT !== undefined && process.env.SECURE_PORT !== null){
    console.log('useHttps was set to true.');
    useHttps = true;
    https = require('https');
}else{
    console.log('useHttps was not set to true.');
}
//////////////////////
//END HTTPS CONFIG
//////////////////////

//////////////////////
//BEGIN MYSQL CONFIG
//////////////////////
var mySqlIp = process.env.MYSQL_PORT_3306_TCP_ADDR || null;
var mySqlConnection = null;

if(mySqlIp !== null && mySqlIp !== null){
    try {
         var mysqlClient = require('mysql');
         mySqlConnection = mysqlClient.createConnection({
             host: mySqlIp,
             user: process.env.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root',
             password: process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD,
             database : process.env.MYSQL_ENV_MYSQL_DATABASE_NAME || 'ncidence'
         });
    }catch (e) {
        console.log('FAILED TO LOAD mysql. ');
        console.log(e)
    }
}
//////////////////////
//END MYSQL CONFIG
//////////////////////

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];

io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
