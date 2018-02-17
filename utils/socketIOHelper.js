/* jshint node:true */ /* global define, escape, unescape */
"use strict";

class SocketIOHelper {
	constructor(server, tokenUtil) {
		this.messages = [];
		this.sockets = [];
		this.socketUserNameMap = {};
		this.socketIdMap = {};
		

		var socketio = require('socket.io');
		this.io = socketio.listen(server);
		this.async = require('async');
		this.cookie = require('cookie');
		this.tokenUtil = tokenUtil;
	}
	
	logoutUser(socketId) {
		if(socketId && this.socketIdMap[socketId]) {
			const socket = this.socketIdMap[socketId];
			socket.loggedOut = true;
			socket.name = 'Anonymous';
			this.updateRoster();
			
			if(socket.myParent) {
				this.logoutUser(socket.myParent.id)
			}
		}
	}
	
	loginUser(socketId, user, token) {
		if(socketId && this.socketIdMap[socketId]) {
			const socket = this.socketIdMap[socketId];
			socket.name = user.username;
			socket.loggedOut = false;
			socket.token = token;
			this.updateRoster();
			if(socket.myParent) {
				this.loginUser(socket.myParent.id, user, token)
			}
		}
	}
	
	updateRoster() {
		const foundNames = {};
		this.async.map(
			this.sockets,
			(socket, callback) => {
				foundNames[socket.name] = foundNames[socket.name] ? foundNames[socket.name] + 1 : 1;
				callback(null, (socket.myParent === undefined && (socket.name === 'Anonymous' || foundNames[socket.name] === 1)) ? socket.name : null);
			},
			(err, names) => {
				this.broadcast('roster', names);
			}
		);
	}
	
	broadcast(event, data) {
		this.sockets.forEach((socket) => {
			socket.emit(event, data);
		});
	}

	init() {
		
		this.io.on('connection', (socket) => {
			const cookies = this.cookie.parse(socket.request.headers.cookie || '');
			
			if(cookies.io) {
				socket.myParent = this.socketIdMap[cookies.io];
				if(socket.myParent) {
					socket.myParent.myChild = socket;
				}
			}
			this.socketIdMap[socket.id] = socket;
			this.sockets.push(socket);
			
			
			//SET USER INFO
			var setUserInfo = (socket) => {
				if(socket.loggedOut) {
					socket.name = 'Anonymous';
				}else {
					var token = socket.token ? socket.token : this.tokenUtil.getTokenFromCookies(cookies);
					var user = token ? this.tokenUtil.verifyToken(token) : null;
					socket.name = String((user ? user.username : null) || 'Anonymous');
					if(!user) {
						this.updateRoster();
					}
				}
			}
			setUserInfo(socket);



			this.messages.forEach((data) => {
				socket.emit('message', data);
			});

			socket.on('disconnect', () => {
				if(socket.myParent) {
					socket.myParent.myChild = undefined;
				}
				if(socket.myChild) {
					socket.myChild.myParent = undefined;
				}
				this.socketIdMap[socket.id] = undefined;;
				this.sockets.splice(this.sockets.indexOf(socket), 1);
				this.updateRoster();
			});

			socket.on('message', (msg) => {
				setUserInfo(socket);
				var text = String(msg || '');

				if (!text)
					return;

				var data = {
					name: socket.name,
					text: text
				};

				this.broadcast('message', data);
				this.messages.push(data);
			});

			socket.on('identify', () => {
				setUserInfo(socket);
				this.updateRoster();
			});


		});
	}
}

try {
	exports.SocketIOHelper = SocketIOHelper;
}
catch (err) {

}