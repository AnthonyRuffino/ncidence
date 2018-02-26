/* jshint node:true */ /* global define, escape, unescape */
"use strict";

const getHook = function(code) {
	return new Function(['ctx'].join(','), code);
}

class SocketIOHelper {
	constructor({ server, tokenUtil, gameService, debug }) {
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
		this.requireFromString = require('require-from-string');
		
		this.subdomainCaches = {};
		this.debug = debug;
	}
	
	
	log(msg, err) {
        if (this.debug) {
            if (err) {
                console.error(msg);
                console.error(err);
            }
            else {
                console.log(msg);
            }
        }
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
				if(err) {
					console.error('updateRoster err', err);
				}
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
			//
			// 1. Get ncidenceCookie (Unique per browser session);
			//
			const cookies = this.cookie.parse(socket.request.headers.cookie || '');
			const ncidenceCookie = cookies.ncidence;
			
			
			//
			// 2. Create List of all sockets related to the curent user
			//
			if(this.socketNcidenceCookieMap[ncidenceCookie] === undefined) {
				this.socketNcidenceCookieMap[ncidenceCookie] = [];
			}
			this.socketNcidenceCookieMap[ncidenceCookie].push(socket.id);
			
			
			//
			// 3. Socket caching (per tab)
			//
			this.socketIdMap[socket.id] = socket;
			this.sockets.push(socket);
			
			
			//
			// 4. Track life of socket.io cookies accross tabs
			//
			if (cookies.io) {
				socket.myParent = this.socketIdMap[cookies.io];
				if (socket.myParent) {
					socket.myParent.myChild = socket;
				}
			}
			
			
			//
			// 5. Get Subdomain
			//
			socket.subdomain = await ((host) => {
				return new Promise(async (resolve, reject) => {
					let subdomain = this.getSubdomain(host);
					subdomain = subdomain === undefined ? '#' : subdomain;
					
					if(!this.subdomainInfoMap[subdomain]) {
						let gameAndDatabaseTemp = await this.gameService.getGameAndDatabase(subdomain);
						const game = gameAndDatabaseTemp && gameAndDatabaseTemp.game ? gameAndDatabaseTemp.game : null;
						
						this.subdomainInfoMap[subdomain] = {
							subdomain : subdomain, 
							game,
							owner: (game ? game.owner.username : null)
						};
					}
					if (this.messages[subdomain] === undefined) {
						this.messages[subdomain] = [];
					}
				
					resolve(subdomain);
				});
				
			})(socket.request.headers.host);
			
			
			// 
			// 6. Inform client of connection
			//
			socket.emit('connected', this.subdomainInfoMap[socket.subdomain]);
			
			
			//
			// 7. Send user info to client
			//
			const setUserInfo = (socket) => {
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
				}
			}
			(() => {
				setUserInfo(socket);
				this.updateRoster(socket);
				socket.emit('whoami', socket.name );
			})();
			
			
			
			//
			// 8. Emit all stored messages for subdomain to client
			//
			this.messages[socket.subdomain].forEach((data) => {
				socket.emit('message', data);
			});
			
			
			
			//
			// 9. Handle disconnect
			//
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
			
			
			
			//
			// 10. Handle message
			//
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
			
			
			
			//
			// 12. Set cache for subdomain
			//
			if(this.subdomainCaches[socket.subdomain] === undefined) {
				this.subdomainCaches[socket.subdomain] = {};
			}
	        
	        
	        
			//
			// 13. Register backend socket.io endpoints
			//
			const driverExports = await this.getGameExports(socket.subdomain, 'driver', { version: global.__defaultGameVersion }) | {};
			const backendExports = await this.getGameExports(socket.subdomain, 'backend', { version: global.__defaultGameVersion }) || {};
			
			
			const socketIOHooks = backendExports.getSocketIOHooks ? (backendExports.getSocketIOHooks() || []) : [];
			socketIOHooks.forEach((socketIOHook) => {
				socket.on(socketIOHook.on, (dataIn) => {
					try {
						socketIOHook.run({
							emit: (message, data) => socket.emit(message, data),
							dataIn,
							username: socket.name,
							subdomain: socket.subdomain,
							broadcast: (data) => this.broadcast('message', data, socket),
							driverExports: driverExports,
							cache: this.subdomainCaches[socket.subdomain]
						});
				    }
				    catch (executionException) {
				      console.error('Error registering code hook: ', socketIOHook, executionException);
				    }
				});
			});
		});
	}
	
	
	getGameExports(subdomain, type, filter) {
		return new Promise(async (resolve, reject) =>{
			let entity;
			
			if(this.subdomainInfoMap[subdomain].game) {
				try{
					entity = await this.gameService.getGameEntityRecord(subdomain, type, filter);
				}catch(err) {
					console.error(`Error getting game ${type}: `, err);
				}
			}
			
			let exportsForType = {
				[`DEFAULT_EXPORTS_${type}`]: { subdomain, filter, type }
			};
			
			if(entity && entity.content !== undefined) {
				try {
					this.log(`Loading custom exports for ${type}`, subdomain);
					exportsForType = this.requireFromString(entity.content.toString('utf8'));
				} catch(err) {
					console.error(`Error loading exports for ${type}`, err);
				}
			} else {
				const filePath = (type === 'driver' ? (global.__publicdir + '/') : global.__base) + type + '.js';
				this.log(subdomain, `Loading default exports for ${type}`, subdomain, filePath);
				exportsForType = require(filePath);
			}
			resolve(exportsForType);
		});
	}
}

module.exports = function(configuration){
	return new SocketIOHelper(configuration);
}