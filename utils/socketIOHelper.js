/* jshint node:true */ /* global define, escape, unescape */
"use strict";

class SocketIOHelper {
	constructor({ server, tokenUtil, gameService }) {
		this.messages = {};
		this.sockets = [];
		this.socketNcidenceCookieMap = {};
		this.socketIdMap = {};
		this.subdomainInfoMap = {};


		let socketio = require('socket.io');
		this.io = socketio.listen(server);
		this.async = require('async');
		this.cookie = require('cookie');
		this.tokenUtil = tokenUtil;
		this.gameService = gameService;
		this.requireFromString = require('require-from-string');

		this.subdomainCaches = {};
		
		this.backendLogs = {}
		this.cachedBackends = {};
		
		this.gameloop = require('node-gameloop');
		this.cachedGameLoops = {};

		this.constants = require(global.__rootdir + 'constants.js');
		
		this.anonymousPrefix = '?_Anonymous-';
	}
	
	getAnonymousUserName(ncidenceCookie) {
		return `${this.anonymousPrefix}${ncidenceCookie}`;
	}
	
	isAnonymousUserName(username) {
		return username.indexOf(this.anonymousPrefix) === 0;
	}

	logoutUserHook(req) {
		const ncidenceCookie = req.cookies.ncidence;
		if (ncidenceCookie && this.socketNcidenceCookieMap[ncidenceCookie] !== undefined) {
			this.socketNcidenceCookieMap[ncidenceCookie].forEach(socketId => {
				if (this.socketIdMap[socketId] != undefined) {
					const anonymousUserName = this.getAnonymousUserName(ncidenceCookie);
					const socket = this.socketIdMap[socketId];
					socket.loggedOut = true;
					socket.name = anonymousUserName;
					socket.emit('whoami', anonymousUserName);
					this.updateRoster(socket);
				}
			});
		}
	}


	loginUserHook(req, user, token) {
		const ncidenceCookie = req.cookies.ncidence;
		if (ncidenceCookie && this.socketNcidenceCookieMap[ncidenceCookie] !== undefined) {
			this.socketNcidenceCookieMap[ncidenceCookie].forEach(socketId => {
				if (this.socketIdMap[socketId] !== undefined) {
					const socket = this.socketIdMap[socketId];
					socket.name = user.username;
					socket.loggedOut = false;
					socket.token = token;
					socket.emit('whoami', user.username);
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
				callback(null, (socket.myParent === undefined && (this.isAnonymousUserName(socket.name) || foundNames[socket.name] === 1)) ? socket.name : null);
			},
			(err, names) => {
				if (err) {
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
		this.io.on('connection', async(socket) => {
			//
			//  Get ncidenceCookie (Unique per browser session);
			//
			socket.cookies = this.cookie.parse(socket.request.headers.cookie || '');
			const ncidenceCookie = socket.cookies.ncidence;


			//
			//  Create List of all sockets related to the curent user
			//
			if (this.socketNcidenceCookieMap[ncidenceCookie] === undefined) {
				this.socketNcidenceCookieMap[ncidenceCookie] = [];
			}
			this.socketNcidenceCookieMap[ncidenceCookie].push(socket.id);


			//
			//  Socket caching (per tab)
			//
			this.socketIdMap[socket.id] = socket;
			this.sockets.push(socket);


			//
			//  Track life of socket.io cookies accross tabs
			//
			if (socket.cookies.io) {
				socket.myParent = this.socketIdMap[socket.cookies.io];
				if (socket.myParent) {
					socket.myParent.myChild = socket;
				}
			}


			//
			//  Get Subdomain
			//
			socket.subdomain = this.constants.getSubdomain(socket.request.headers.host);
			socket.subdomain = socket.subdomain === undefined ? '#' : socket.subdomain;
			await this.setSubdomainInfoMapAndMessages(socket.subdomain);


			// 
			//  Inform client of connection
			//
			socket.emit('connected', this.subdomainInfoMap[socket.subdomain]);


			//
			//  Send user info to client
			//
			
			(() => {
				this.setUserInfo(socket);
				this.updateRoster(socket);
				socket.emit('whoami', socket.name);
			})();



			//
			//  Emit all stored messages for subdomain to client
			//
			this.messages[socket.subdomain].forEach((data) => {
				socket.emit('message', data);
			});



			//
			//  Handle disconnect
			//
			socket.on('disconnect', () => {
				if (socket.myParent) {
					socket.myParent.myChild = undefined;
				}
				if (socket.myChild) {
					socket.myChild.myParent = undefined;
				}
				this.socketNcidenceCookieMap[ncidenceCookie].splice(this.socketNcidenceCookieMap[ncidenceCookie].indexOf(socket.id), 1);
				this.socketIdMap[socket.id] = undefined;
				this.sockets.splice(this.sockets.indexOf(socket), 1);
				this.updateRoster(socket);
			});
			
			
			//
			//  built-in utils
			//
			this.builtInOnMessage(socket);
			this.builtInOnCommand(socket);
			
			
			try{
				const backend = await this.setupBackend(socket);
				const socketIOHooks = backend.getSocketIOHooks({ log: (...args) => socket.emit('debug', args) });
					socketIOHooks.forEach((socketIOHook) => {
						socket.on(socketIOHook.on, (dataIn) => {
							try {
								socketIOHook.run({
									emit: (message, data) => socket.emit(message, data),
									dataIn,
									username: socket.name
								});
							} catch (err) {
								console.info('Error registering code hook: ', socketIOHook, err);
								socket.emit('debug', { socketIOHook, message: err && err.message ? err.message : err });
							}
						});
					});
			} catch(err) {
				console.error('Issue setting up backend');
			}
			
		});
	}


    clearFromSubdomainInfoMap(subdomain) {
        this.subdomainInfoMap[subdomain] = undefined;
    }
	setSubdomainInfoMapAndMessages(subdomain) {
		return new Promise(async(resolve, reject) => {
			subdomain = subdomain === undefined ? '#' : subdomain;

			if (!this.subdomainInfoMap[subdomain]) {
				let gameAndDatabaseTemp = await this.gameService.getGameAndDatabase(subdomain);
				const game = gameAndDatabaseTemp && gameAndDatabaseTemp.game ? gameAndDatabaseTemp.game : null;

				this.subdomainInfoMap[subdomain] = {
					subdomain: subdomain,
					game,
					owner: (game ? game.owner.username : 'admin')
				};
			}
			if (this.messages[subdomain] === undefined) {
				this.messages[subdomain] = [];
			}
			resolve(true);
		});
	}
	
	
	
	setUserInfo(socket) {
		if (socket.loggedOut) {
			socket.name = this.getAnonymousUserName(socket.cookies.ncidence);
		}
		else {
			let token = socket.token ? socket.token : this.tokenUtil.getTokenFromCookies(socket.cookies);
			let user = token ? this.tokenUtil.verifyToken(token) : null;
			socket.name = String((user ? user.username : null) || this.getAnonymousUserName(socket.cookies.ncidence));
			if (!user) {
				this.updateRoster(socket);
			}
		}
	}
	
	builtInOnMessage(socket) {
		socket.on('message', (msg) => {
			this.setUserInfo(socket);
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
	}
	
	
	startGameLoop(subdomain, tag) {
		if(!tag) {
			return { success: false, args: [subdomain, 'no tag provided'] };
		} else if(!this.cachedBackends[subdomain]) {
			return { success: false, args: [subdomain, 'no backend loaded. Game loop: ', tag] };
		} else if(!this.cachedBackends[subdomain].update) {
			return { success: false, args: [subdomain, 'backend does not have update method. Game loop: ', tag] };
		} else {
			
			if(!this.cachedGameLoops[subdomain]) {
				this.cachedGameLoops[subdomain] = [];
			}
			if(this.cachedGameLoops[subdomain][tag]) {
				this.cachedGameLoops[subdomain][tag] = undefined;
			}
			
			const updateMethod = this.cachedBackends[subdomain].update;
			
			if(!updateMethod) {
				return { success: false, args: [subdomain, 'no update method found', tag] };
			}
			
			
			// start the loop at 30 fps (1000/30ms per frame) and grab its id 
	        const gameLoopId = this.gameloop.setGameLoop((delta) => {
	        	
	        	try {
	        		updateMethod(delta, tag);
	        	} catch (err) {
	        		console.log('GAMELOOP ERROR: ' + err, updateMethod);
	        		throw err;
	        	}
	        	
	        	
	        }, 1000 / 30);
	        this.cachedGameLoops[subdomain][tag] = gameLoopId;
	        return { success: true, args: [subdomain, 'game loop started', tag] };
		}
	}
	
	
	stopGameLoop(subdomain, tag) {
		if(this.cachedGameLoops[subdomain] && this.cachedGameLoops[subdomain][tag] !== undefined) {
			this.gameloop.clearGameLoop(this.cachedGameLoops[subdomain][tag]);
			this.cachedGameLoops[subdomain][tag] = undefined;
			//console.log(socket.subdomain, 'game loop cleared', tag);
			return { success: true, args: [subdomain, 'game loop cleared', tag] };
		}else {
			return { success: false, args: [subdomain, 'no such game loop', tag] };
		}
		
		// if(this.cachedGameLoops[subdomain]) {
			
		// 	Object.keys(this.cachedGameLoops[subdomain]).forEach((tag) => {
		// 		if(this.cachedGameLoops[subdomain][tag] !== undefined) {
		// 			this.gameloop.clearGameLoop(this.cachedGameLoops[subdomain][tag]);
		// 			this.cachedGameLoops[subdomain][tag] = undefined;
		// 		}
		// 	});
		// }
	}
	
	builtInOnCommand(socket) {
		
		socket.on('command', (msg) => {
			this.setUserInfo(socket);
			let text = String(msg || '');

			if (!text) {
				socket.emit('debug', 'missing command');
				return;
			}
			
			if(msg.name === undefined) {
				socket.emit('debug', 'missing command name');
				return;
			}
			
			const isOwner = socket.name === this.subdomainInfoMap[socket.subdomain].owner || socket.name === 'admin';
			
			if(!isOwner) {
				return;
			}
			
			console.log('command', msg);
			if(isOwner && msg.name === 'refresh-backend'){
				//TODO: Make this code more robust (reset active socketio sessions, cleanup old gameloops, etc.)
				console.log(`[${socket.subdomain}] - REFRESH`);
				this.refreshBackend(socket.subdomain);
				this.setupBackend(socket);
				socket.emit('debug', 'backend refreshed');
			} else if(isOwner && msg.name === 'start-game-loop'){
				console.log(`[${socket.subdomain}] - START-GAME-LOOP`, msg.tag);
				socket.emit('debug', this.startGameLoop(socket.subdomain, msg.tag));
			} else if(isOwner && msg.name === 'stop-game-loop'){
				console.log(`[${socket.subdomain}] - STOP-GAME-LOOP`, msg.tag);
				socket.emit('debug', this.stopGameLoop(socket.subdomain, msg.tag));
			}  else if(isOwner && msg.name === 'game-logs'){
				console.log(`[${socket.subdomain}] - GAME LOGS`, msg.tag);
				if(!this.backendLogs || !this.backendLogs[socket.subdomain]) {
					socket.emit('debug', 'no logs found');
				}else {
					socket.emit('debug', this.backendLogs[socket.subdomain]);
				}
			}
		});
	}
	
	refreshBackend(subdomain) {
		this.cachedBackends[subdomain] = false;
	}
	
	setupBackend(socket) {
		return new Promise(async (resolve, reject) => {
			
			let backend = false;
			
			if (this.cachedBackends[socket.subdomain]) {
				//console.info(socket.subdomain, `[${socket.subdomain}] - Getting cached backend`);
				backend = this.cachedBackends[socket.subdomain];
				
				//let objectSizeof = require("object-sizeof");
				//console.info('BACKEND SIZE: ', objectSizeof(backend));
			}
			
			
			if (this.subdomainCaches[socket.subdomain] === undefined) {
				this.subdomainCaches[socket.subdomain] = {};
			}
			
			if(!backend) {
				console.info(`[${socket.subdomain}] - Loading backend`);
				
				const dataSourcesAndServices = {
					subdomain: socket.subdomain,
					broadcast: (data) => this.broadcast('message', data, socket),
					cache: this.subdomainCaches[socket.subdomain],
					gameloop: {
						start: (tag) => {
							this.startGameLoop(socket.subdomain, tag);
						},
						stop: (tag) => {
							this.stopGameLoop(socket.subdomain, tag);
						}
					}
				};
				
				
				// Register common and backend code
				const commonExports = await this.getGameExports(socket.subdomain, 'common', { version: this.constants.defaultGameVersion }) || {};

				const common = (() => {

                    let commonTemp = {};
                    try{
                        commonTemp = commonExports.upwrapExports(dataSourcesAndServices);
					}catch(err) {
						console.error('Exception while unwrapping common exports', err);
					}
					return commonTemp;
				})()

                dataSourcesAndServices.common = common;
				
				if(!this.backendLogs[socket.subdomain]) {
					this.backendLogs[socket.subdomain] = [];
				}
				const backendExports = await this.getGameExports(socket.subdomain, 'backend', { version: this.constants.defaultGameVersion }) || {};
				backend = new(backendExports.upwrapExports({
					console: { log: (args) => {
						this.backendLogs[socket.subdomain].splice(0,0, args);
						this.backendLogs[socket.subdomain] = this.backendLogs[socket.subdomain].slice(0,1000);
					}},
					global: {
						
					}
				}))(dataSourcesAndServices);
				
				console.log(`[${socket.subdomain}] - Back-end loaded`);
				
				this.cachedBackends[socket.subdomain] = backend;
				
				if(backend.startGameLoopImmediately) {
					console.log(`[${socket.subdomain}] - startGameLoopImmediately`);
					backend.gameloop.start('main');
				}
			}
			
			resolve(backend);
		});
	}
	
	getGameExports(subdomain, type, filter) {
		return new Promise(async(resolve, reject) => {
			let entity;

			if (this.subdomainInfoMap[subdomain].game) {
				try {
					entity = await this.gameService.getGameEntityRecord(subdomain, type, filter);
				}
				catch (err) {
					console.error(`[${subdomain}] - Error getting game ${type}: `, err);
				}
			}

			let exportsForType = {
				[`DEFAULT_EXPORTS_${type}`]: { subdomain, filter, type }
			};
			
			
			const wrapExports = (code) => 
				`exports.upwrapExports = ({
			    	console, 
				    global,
				    process = {},
				    __dirname = '__dirname-not-supported', 
				    __filename = '__filename-not-supported', 
				    require = 'require-not-supported'
				 }) => {
					${code}
					${type === 'common' ? 'return common' : ''}
				 }`;
			

			if (entity && entity.content !== undefined) {
				try {
					console.info(`[${subdomain}] - Loading custom exports for ${type}`);
					exportsForType = this.requireFromString(wrapExports(entity.content.toString('utf8')));
                    console.info(`[${subdomain}] - Done Loading custom exports for ${type}`);
					resolve(exportsForType);
					return;
				}
				catch (err) {
					console.error(`[${subdomain}] - Error loading custom exports for ${type}`, err);
                    resolve(exportsForType);
                    return;
				}
			}
			else {
				const filePath = (type === 'common' ? global.__publicdir : global.__rootdir) + type + '.js';
				console.info(`[${subdomain}] - Loading default exports for ${type}. filePath: ${filePath}`);
				
				try{
					require('fs').readFile(filePath, "utf8", (err, codeContent) => {
			          if(err) {
			            console.error(`error getting default ${type}`);
			            resolve(exportsForType);
			            return;
			          }
			          try {
							exportsForType = this.requireFromString(wrapExports(codeContent));
							resolve(exportsForType);
							return;
						}
						catch (err) {
							console.error(`[${subdomain}] - Error loading default exports for ${type}`, err);
							resolve(exportsForType);
							return;
						}
			        });
				} catch(err) {
					resolve(exportsForType);
					return;
				}
			}
		});
	}
}

module.exports = function(configuration) {
	return new SocketIOHelper(configuration);
};