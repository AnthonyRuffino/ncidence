/* jshint node:true */ /* global define, escape, unescape */
"use strict";

class SocketIOHelper {
	constructor({ server, tokenUtil, gameService }) {
		this.messages = {};
		this.sockets = [];
		this.socketNcidenceCookieMap = {};
		this.socketUserNameMap = {};
		this.socketIdMap = {};
		this.subdomainInfoMap = {};


		let socketio = require('socket.io');
		this.io = socketio.listen(server);
		this.async = require('async');
		this.cookie = require('cookie');
		this.tokenUtil = tokenUtil;
		this.getSubdomain = global.__getSubdomain;
		this.gameService = gameService;
	}
	
	
	logoutUserHook(req) {
		const ncidenceCookie = req.cookies.ncidence;
		if(ncidenceCookie && this.socketNcidenceCookieMap[ncidenceCookie] !== undefined) {
			this.socketNcidenceCookieMap[ncidenceCookie].forEach(socketId => {
				if (this.socketIdMap[socketId] != undefined) {
					const socket = this.socketIdMap[socketId];
					socket.loggedOut = true;
					socket.name = 'Anonymous';
					socket.emit('whoami', 'Anonymous' );
					this.updateRoster(socket);
				}
			});
		}
	}

	loginUserHook(req, user, token) {
		const ncidenceCookie = req.cookies.ncidence;
		if(ncidenceCookie && this.socketNcidenceCookieMap[ncidenceCookie] !== undefined) {
			this.socketNcidenceCookieMap[ncidenceCookie].forEach(socketId => {
				if (this.socketIdMap[socketId] !== undefined) {
					const socket = this.socketIdMap[socketId];
					socket.name = user.username;
					socket.loggedOut = false;
					socket.token = token;
					socket.emit('whoami', user ? user.username : 'Anonymous' );
					this.updateRoster(socket);
				}
			});
		}
	}
	updateRoster(socket) {
		const foundNames = {};
		this.async.map(
			this.sockets.filter(s => s.subdomain === socket.subdomain),
			(socket, callback) => {
				foundNames[socket.name] = foundNames[socket.name] ? foundNames[socket.name] + 1 : 1;
				callback(null, (socket.myParent === undefined && (socket.name === 'Anonymous' || foundNames[socket.name] === 1)) ? socket.name : null);
			},
			(err, names) => {
				this.broadcast('roster', names, socket);
			}
		);
	}

	broadcast(event, data, socket) {
		this.sockets.filter(s => s.subdomain === socket.subdomain).forEach((socket) => {
			socket.emit(event, data);
		});
	}

	init() {

		this.io.on('connection', async (socket) => {
			const cookies = this.cookie.parse(socket.request.headers.cookie || '');
			socket.subdomain = this.getSubdomain(socket.request.headers.host);
			socket.subdomain = socket.subdomain === undefined ? '#' : socket.subdomain;
			
			const ncidenceCookie = cookies.ncidence;
			
			if(this.socketNcidenceCookieMap[ncidenceCookie] === undefined) {
				this.socketNcidenceCookieMap[ncidenceCookie] = [];
			}
			this.socketNcidenceCookieMap[ncidenceCookie].push(socket.id);
			
			if(!this.subdomainInfoMap[socket.subdomain]) {
				let gameTemp = await this.gameService.getGame(socket.subdomain);
				this.subdomainInfoMap[socket.subdomain] = {subdomain : socket.subdomain, owner: (gameTemp.game !== undefined ? gameTemp.game.owner.username : null)};
			}
			const subDomainInfo = this.subdomainInfoMap[socket.subdomain];


			if (this.messages[socket.subdomain] === undefined) {
				this.messages[socket.subdomain] = [];
			}

			if (cookies.io) {
				socket.myParent = this.socketIdMap[cookies.io];
				if (socket.myParent) {
					socket.myParent.myChild = socket;
				}
			}
			this.socketIdMap[socket.id] = socket;
			this.sockets.push(socket);
			socket.emit('connected', subDomainInfo);

			//SET USER INFO
			let setUserInfo = (socket) => {
				if (socket.loggedOut) {
					socket.name = 'Anonymous';
				}
				else {
					let token = socket.token ? socket.token : this.tokenUtil.getTokenFromCookies(cookies);
					let user = token ? this.tokenUtil.verifyToken(token) : null;
					socket.name = String((user ? user.username : null) || 'Anonymous');
					if (!user) {
						this.updateRoster(socket);
					}
					return user
				}
			}
			(() => {
				const user = setUserInfo(socket);
				this.updateRoster(socket);
				socket.emit('whoami', user ? (user.username ? user.username : 'Anonymous-' + user.id) : 'Anonymous' );
			})();
			

			this.messages[socket.subdomain].forEach((data) => {
				socket.emit('message', data);
			});

			socket.on('disconnect', () => {
				if (socket.myParent) {
					socket.myParent.myChild = undefined;
				}
				if (socket.myChild) {
					socket.myChild.myParent = undefined;
				}
				this.socketNcidenceCookieMap[ncidenceCookie].splice(this.socketNcidenceCookieMap[ncidenceCookie].indexOf(socket.id), 1)
				this.socketIdMap[socket.id] = undefined;
				this.sockets.splice(this.sockets.indexOf(socket), 1);
				this.updateRoster(socket);
			});

			socket.on('message', (msg) => {
				setUserInfo(socket);
				let text = String(msg || '');

				if (!text)
					return;

				let data = {
					name: socket.name,
					text: text
				};

				this.broadcast('message', data, socket);
				this.messages[socket.subdomain].push(data);
			});


		});
	}
}

module.exports = function(configuration){
	return new SocketIOHelper(configuration);
}