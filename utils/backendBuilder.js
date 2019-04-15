class BackendBuilder {
	constructor({ backendLogs,constants,gameService,broadcast }) {
			this.backendLogs = backendLogs;
			this.constants = constants;
			this.gameService = gameService;
			this.broadcast = broadcast;
			
			this.ofValue = require("of-value");
			this.requireFromString = require('require-from-string');
			this.gameloop = require('node-gameloop');
			
			this.cachedBackends = {};
			this.subdomainCaches = {};
			this.cachedGameLoops = {};
	}
	
	fetchFromCache(subdomain) {
		return this.cachedBackends[subdomain];
	}
	
	build(subdomain, useCache = true) {
		return new Promise(async (resolve, reject) => {
			
			let backend = false;
			
			if (useCache && this.cachedBackends[subdomain]) {
				//console.info(subdomain, `[${subdomain}] - Getting cached backend`);
				backend = this.cachedBackends[subdomain];
				
				//let objectSizeof = require("object-sizeof");
				//console.info('BACKEND SIZE: ', objectSizeof(backend));
			}
			
			
			if (this.subdomainCaches[subdomain] === undefined) {
				this.subdomainCaches[subdomain] = {};
			}
			
			if(!backend) {
				console.info(`[${subdomain}] - Loading backend`);
				
				const dataSourcesAndServices = {
					subdomain: subdomain,
					broadcast: (data) => this.broadcast('message', data, subdomain),
					cache: this.subdomainCaches[subdomain],
					gameloop: {
						start: (tag) => {
							this.startGameLoop(subdomain, tag);
						},
						stop: (tag) => {
							this.stopGameLoop(subdomain, tag);
						}
					},
					characterHelper: {
						find: ({name, user}) => {
							return new Promise(async (resolve, reject) => {
								let characters = await this.gameService.getGameEntityRecord(
									subdomain,
									'character', this.ofValue.stripUndefined({name, user}));
								if(!characters) {
									resolve([]);
								} else {
									const returnList = [];
									characters.forEach((character) => {
										returnList.push({...character,
										data: () => {
											let buffer = Buffer.from(JSON.parse(JSON.stringify(character.data)).data).toString();
											//console.log('Character data loaded: ' + buffer);
											return JSON.parse(buffer.toString());
										}});
									});
									resolve(returnList);
								}
							});
						}
					},
					console: { log: (args) => {
						this.backendLogs[subdomain].splice(0,0, args);
						this.backendLogs[subdomain] = this.backendLogs[subdomain].slice(0,1000);
					}},
					global: {
						
					}
				};
				
				
				const environment = {
					console: { log: (args) => {
						this.backendLogs[subdomain].splice(0,0, args);
						this.backendLogs[subdomain] = this.backendLogs[subdomain].slice(0,1000);
					}},
					global: {
						
					}
				};
				
				
				// Register common and backend code
				const commonExports = await this.getGameExports(subdomain, 'common', { version: this.constants.defaultGameVersion }) || {};

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
				
				if(!this.backendLogs[subdomain]) {
					this.backendLogs[subdomain] = [];
				}
				const backendExports = await this.getGameExports(subdomain, 'backend', { version: this.constants.defaultGameVersion }) || {};
				backend = new(backendExports.upwrapExports(environment))(dataSourcesAndServices);
				
				console.log(`[${subdomain}] - Back-end loaded`);
				
				this.cachedBackends[subdomain] = backend;
				
				if(backend.startGameLoopImmediately) {
					console.log(`[${subdomain}] - startGameLoopImmediately`);
					backend.gameloop.start('main');
				}
			}
			
			resolve(backend);
		});
	}
	
	getGameExports(subdomain, type, filter) {
		return new Promise(async(resolve, reject) => {
			let entity;
			
			if(subdomain !== '#') {
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
				    window = {},
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
	
	
	startGameLoop(subdomain, tag) {
		if(!tag) {
			return { success: false, args: [subdomain, 'no tag provided'] };
		} else if(!this.fetchFromCache(subdomain)) {
			return { success: false, args: [subdomain, 'no backend loaded. Game loop: ', tag] };
		} else if(!this.fetchFromCache(subdomain).update) {
			return { success: false, args: [subdomain, 'backend does not have update method. Game loop: ', tag] };
		} else {
			
			if(!this.cachedGameLoops[subdomain]) {
				this.cachedGameLoops[subdomain] = [];
			}
			if(this.cachedGameLoops[subdomain][tag]) {
				this.cachedGameLoops[subdomain][tag] = undefined;
			}
			
			const updateMethod = this.fetchFromCache(subdomain).update;
			
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
	}
}


module.exports = function(services) {
	return new BackendBuilder(services);
};


