class BackendBuilder {
	constructor({ socketIOHelper }) {
			this.socketIOHelper = socketIOHelper;
			this.ofValue = require("of-value");
			this.requireFromString = require('require-from-string');
	}
	
	build(subdomain, useCache = true) {
		return new Promise(async (resolve, reject) => {
			
			let backend = false;
			
			if (useCache && this.socketIOHelper.cachedBackends[subdomain]) {
				//console.info(subdomain, `[${subdomain}] - Getting cached backend`);
				backend = this.socketIOHelper.cachedBackends[subdomain];
				
				//let objectSizeof = require("object-sizeof");
				//console.info('BACKEND SIZE: ', objectSizeof(backend));
			}
			
			
			if (this.socketIOHelper.subdomainCaches[subdomain] === undefined) {
				this.socketIOHelper.subdomainCaches[subdomain] = {};
			}
			
			if(!backend) {
				console.info(`[${subdomain}] - Loading backend`);
				
				const dataSourcesAndServices = {
					subdomain: subdomain,
					broadcast: (data) => this.socketIOHelper.broadcast('message', data, subdomain),
					cache: this.socketIOHelper.subdomainCaches[subdomain],
					gameloop: {
						start: (tag) => {
							this.socketIOHelper.startGameLoop(subdomain, tag);
						},
						stop: (tag) => {
							this.socketIOHelper.stopGameLoop(subdomain, tag);
						}
					},
					characterHelper: {
						find: ({name, user}) => {
							return new Promise(async (resolve, reject) => {
								let characters = await this.socketIOHelper.gameService.getGameEntityRecord(
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
						this.socketIOHelper.backendLogs[subdomain].splice(0,0, args);
						this.socketIOHelper.backendLogs[subdomain] = this.socketIOHelper.backendLogs[subdomain].slice(0,1000);
					}},
					global: {
						
					}
				};
				
				
				const environment = {
					console: { log: (args) => {
						this.socketIOHelper.backendLogs[subdomain].splice(0,0, args);
						this.socketIOHelper.backendLogs[subdomain] = this.socketIOHelper.backendLogs[subdomain].slice(0,1000);
					}},
					global: {
						
					}
				};
				
				
				// Register common and backend code
				const commonExports = await this.getGameExports(subdomain, 'common', { version: this.socketIOHelper.constants.defaultGameVersion }) || {};

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
				
				if(!this.socketIOHelper.backendLogs[subdomain]) {
					this.socketIOHelper.backendLogs[subdomain] = [];
				}
				const backendExports = await this.getGameExports(subdomain, 'backend', { version: this.socketIOHelper.constants.defaultGameVersion }) || {};
				backend = new(backendExports.upwrapExports(environment))(dataSourcesAndServices);
				
				console.log(`[${subdomain}] - Back-end loaded`);
				
				this.socketIOHelper.cachedBackends[subdomain] = backend;
				
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

			if (this.socketIOHelper.subdomainInfoMap[subdomain].game) {
				try {
					entity = await this.socketIOHelper.gameService.getGameEntityRecord(subdomain, type, filter);
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
}

module.exports = function(socketIOHelper) {
	return new BackendBuilder(socketIOHelper);
};


