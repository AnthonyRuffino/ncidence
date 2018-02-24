"use strict";

class GameService {
    constructor({ ormHelper, yourSql, debug, secrets, subEntities }) {
        this.ormHelper = ormHelper;
        this.yourSql = yourSql;
        this.debug = debug;
        this.uuidv4 = require('uuid/v4');
        this.crc32 = require('fast-crc32c');
        this.gameOrmHelperMap = {};
        this.subEntities = subEntities;
        this.secrets = secrets;
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

    objectHasName(obj) {
        return !(obj === undefined || obj === null || (Object.keys(obj).length === 0 && obj.constructor === Object) || obj.game === undefined);
    }

    createGameAndSchema({ name, userId }) {
        return new Promise(async(resolve, reject) => {
            try {
                this.log(`createGame: ${name}`);
                const existingGame = await this.getGame(name, false);
                if (this.objectHasName(existingGame)) {
                    throw `A game name '${name}' already exists`;
                }

                this.log(`Creating new game: ${name}`);
                const newGame = await this.createGame(name, userId);
                this.log(`Game created: ${name}`);

                const userAndSchemaName = 'game_' + name;
                await this.yourSql.createUser(userAndSchemaName, 'localhost', newGame.database.password);
                this.log(`User created: ${userAndSchemaName}`);

                await this.yourSql.createDatabase(userAndSchemaName);
                this.log(`Schema created: ${userAndSchemaName}`);

                const ormHelperTemp = require(global.__base + 'utils/ormHelper.js')({
                    ip: this.secrets.dbHost,
                    user: this.secrets.dbUser,
                    password: this.secrets.dbSecret,
                    database: userAndSchemaName,
                    yourSql: this.yourSql,
                    entities: this.subEntities,
                    loadDefaultData: true
                });

                ormHelperTemp.sync(async (err) => {
                    if(err) {
                        reject(err);
                    } else {
                        this.log(`Schema synced: ${userAndSchemaName}`);

                        await this.yourSql.grantAllCrudRightsToUserOnDatabase(userAndSchemaName, 'localhost', userAndSchemaName);
                        this.log(`CRUD rights grated on schema: ${userAndSchemaName}`);
        
                        await this.fetchCachedGameOrmHelper(name, true);
        
                        resolve(newGame);
                    }
                    
                });
                
            }
            catch (ex) {
                reject(ex);
            }
        });
    }

    updateGameDriver({ name, userId, content }) {
        return new Promise(async(resolve, reject) => {
            const gameAndDriver = await this.getGameAndDriver(name);
            if (gameAndDriver !== undefined && gameAndDriver.game !== undefined && gameAndDriver.game.game !== undefined) {
                if (userId !== gameAndDriver.game.game.owner_id) {
                    reject(`You are not the owner of this game and cannot edit the driver. userId: ${userId}, 'gameAndDriver.game.game.owner_id': ${gameAndDriver.game.owner_id}`);
                    return;
                }
                else {
                    gameAndDriver.driver.updateContent(gameAndDriver.driver, content);
                    gameAndDriver.driver.save(resolve);
                }
            } else {
                reject(`No game detected: ${game}`);
                return;
            }
        });
    }


    getGameAndDriver(subdomain) {
        return new Promise((resolve, reject) => {
            this.getGame(subdomain, false).then(async(game) => {
                if (!this.objectHasName(game)) {
                    resolve({});
                    return;
                }
                this.getDriver(game.game.name).then((driver) => {
                    driver = driver ? driver.driver : { content: `window.console.log('no driver for game '${game.game.name}')` };
                    resolve({ game, driver });
                }).catch(() => {
                    resolve({game});
                });
            }).catch(reject);
        });
    };

    getGame(name, fetchPassword) {
        return new Promise((resolve, reject) => {
            try{
                const rootGameOrm = this.ormHelper.getMap()['game'];
                if (!rootGameOrm) {
                    reject({ msg: 'no rootGameOrm', map: this.ormHelper.getMap() });
                    return;
                }
    
    
                rootGameOrm.model.find({ name: name }, (err, games) => {
                    this.log(`Searching for game: ${name}`);
                    if (err) {
                        this.log(`Error checking exisiting game: ${name}`, err);
                        reject(err);
                        return;
                    }
                    if (!games[0]) {
                        this.log(`No game found with name: ${name}`);
                        resolve({});
                        return;
                    }
                    //this.log(`Found game with name: ${name}`);
                    if(fetchPassword) {
                        games[0].getDatabase((err, database) => {
                            if (err) {
                                this.log(`Error getting games database info: ${name}`, err);
                                reject(err);
                                return;
                            }
                            resolve({ game: games[0], database: { ...database, password: fetchPassword ? database.password : undefined } });
                        });
                    } else {
                        resolve({ game: games[0] });
                    }
                    
                });
            }catch(err) {
                console.log('Get game error: ', err);
                resolve({})
            }
            
        });
    }


    getDriver(name) {
        return new Promise((resolve, reject) => {
            this.fetchCachedGameOrmHelper(name, false).then((gameOrmHelper) => {
                
                if(!(gameOrmHelper.getMap()['driver'].model)) {
                    resolve({});
                    return;
                }
                gameOrmHelper.getMap()['driver'].model.find({ name: 'test' }, (err, drivers) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (!drivers[0]) {
                        resolve({});
                        return;
                    }
                    resolve({ driver: drivers[0] });
                });
            }).catch((err) => {
                resolve({});
            });
            
        });
    }

    fetchCachedGameOrmHelper(name, refreshCache) {
        return new Promise(async (resolve, reject) => {
            if (refreshCache || this.gameOrmHelperMap[name] === undefined || this.gameOrmHelperMap[name] === null) {
                const game = await this.getGame(name, true);
                
                const gameOrmHelper = require(global.__base + 'utils/ormHelper.js')({
                    ip: this.secrets.dbHost,
                    user: 'game_' + name,
                    password: game.database.password,
                    database: 'game_' + name,
                    yourSql: null,
                    entities: this.subEntities,
                    loadDefaultData: false
                });
                gameOrmHelper.sync((err) => {
                    if(err) {
                        reject(err);
                    }else {
                        this.gameOrmHelperMap[name] = gameOrmHelper;
                        resolve(this.gameOrmHelperMap[name]);
                    }
                });
                
            }else {
                resolve(this.gameOrmHelperMap[name]);
            }
            
        });
    }

    createGame(name, userId) {
        return new Promise((resolve, reject) => {
            const rootGameOrm = this.ormHelper.getMap()['game'];
            if (!rootGameOrm) {
                reject({ msg: 'no rootGameOrm', map: this.ormHelper.getMap() });
                return;
            }


            rootGameOrm.model.create({ name: name, owner_id: userId }, (err, createdGame) => {
                if (err) {
                    this.log(`Error saving game: ${name}`, err);
                    reject(err);
                    return;
                }
                const database = { password: this.uuidv4().substring(0, 13), mb: 0, game: createdGame };
                rootGameOrm.extensions['database'].create(database, (err, createdExtension) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ createdGame, database });
                });
            });
        });
    }
}

module.exports = function(conf) {
    return new GameService(conf);
};
