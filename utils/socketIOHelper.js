/* jshint node:true *//* global define, escape, unescape */
"use strict";

class SocketIOHelper {
  constructor(server) {
	  this.messages = [];
	  this.sockets = [];
	  
	  var socketio = require('socket.io');
	  this.io = socketio.listen(server);
	  this.async = require('async');
  }
  
  init() {
	  var messages = this.messages;
	  var sockets = this.sockets;
	  var async = this.async;
	  this.io.on('connection', function (socket) {
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
  }
}

try {
    exports.SocketIOHelper = SocketIOHelper;
}
catch(err) {
    
}