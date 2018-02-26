"use strict";

class GameService {
    constructor({ ormHelper, yourSql, debug, secrets }) {
        this.ormHelper = ormHelper;
        this.yourSql = yourSql;
        this.debug = debug;
        this.uuidv4 = require('uuid/v4');
        this.crc32 = require('fast-crc32c');
        this.gameOrmHelperMap = {};
        this.secrets = secrets;
    }
    
    getSubEntities() {
        return [
            require(global.__base + 'utils/orm/entities/gameModels/driver.js')(),
            require(global.__base + 'utils/orm/entities/gameModels/backend.js')(),
            ];
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
    
    

    createGameAndSchema({ name, userId }) {
        return new Promise(async(resolve, reject) => {
            try {
                this.log(`createGame: ${name}`);
                if (await this.getGameAndDatabase(name, false)) {
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
                    entities: this.getSubEntities(),
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


    updateGameDriver({ name, userId, content, version }) {
        return new Promise(async(resolve, reject) => {
            const driver = await this.getGameEntityRecord(name, 'driver', { version } );
            if (driver) {
                const gameAndDatabase = await this.getGameAndDatabase(name);
                if (userId !== gameAndDatabase.game.owner_id) {
                    reject(`You are not the owner of this game and cannot edit the driver. userId: ${userId}, 'gameAndDriver.game.game.owner_id': ${gameAndDatabase.game.owner_id}`);
                    return;
                }
                else {
                    driver.updateContent(driver, content);
                    driver.save(resolve);
                }
            } else {
                reject(`No game detected: ${name}`);
                return;
            }
        });
    }
    
    
    
    getGameAndDatabase(name, fetchPassword) {
        return new Promise((resolve, reject) => {
            try{
                const rootGameOrm = this.ormHelper.getMap()['game'];
                if (!rootGameOrm) {
                    resolve(false);
                    this.log(`No rootGameOrm found with name: ${name}`);
                    return;
                }
    
                rootGameOrm.model.find({ name: name }, (err, games) => {
                    this.log(`Searching for game: ${name}`);
                    if (err) {
                        this.log(`Error checking exisiting game: ${name}`, err);
                        resolve(false);
                        return;
                    }
                    if (!games[0]) {
                        this.log(`No game found with name: ${name}`);
                        resolve(false);
                        return;
                    }
                    
                    games[0].getDatabase((err, database) => {
                        if (err) {
                            console.error(`Error getting games database info: ${name}`, err);
                            resolve(false);
                            return;
                        }
                        resolve({ game: games[0], database: { ...database, password: fetchPassword ? database.password : undefined } });
                    });
                });
            }catch(err) {
                console.error('Get game error: ', err);
                resolve(false);
            }
            
        });
    }

    
    
    getGameEntityRecord(gameName, entitiyName, filter) {
        return new Promise((resolve, reject) => {
            this.fetchCachedGameOrmHelper(gameName, false)
            .then((gameOrmHelper) => {
                try {
                
                    if(!gameOrmHelper) {
                        console.log(gameName, `Error fetching model '[${entitiyName}]'`);
                        resolve(false);
                        return;
                    }
                        
                    if(!(gameOrmHelper.getMap()[entitiyName].model)) {
                        console.log(gameName, `Error fetching model '[${entitiyName}]'`);
                        resolve(false);
                        return;
                    }
                    gameOrmHelper.getMap()[entitiyName].model.find(filter, (err, entities) => {
                        if (err) {
                            console.log(`Game ${gameName}, Error fetching entity '[${entitiyName}]' with filter:`, filter, err);
                            resolve(false);
                            return;
                        }
                        if (!entities[0]) {
                            console.log(`Game: ${gameName}, Entity '[${entitiyName}]' not found after filter:`, filter);
                            resolve(false);
                            return;
                        }
                        resolve(entities[0]);
                    });
                }
                catch(err) {
                    console.log(gameName, `Exception fetching model for '[${entitiyName}]'`, err);
                    resolve(false);
                }
            }).catch((err) => {
                console.log(gameName, `Exception fetching orm helper for '[${gameName}]'`, err);
                resolve(false);
            });
        });
    }


    fetchCachedGameOrmHelper(gameName, refreshCache) {
        return new Promise(async (resolve, reject) => {
            if (refreshCache || this.gameOrmHelperMap[gameName] === undefined || this.gameOrmHelperMap[gameName] === null) {
                const gameAndDatabase = await this.getGameAndDatabase(gameName, true);
                
                if(!gameAndDatabase) {
                    resolve(false);
                    return;
                }
                
                const gameOrmHelper = require(global.__base + 'utils/ormHelper.js')({
                    ip: this.secrets.dbHost,
                    user: 'game_' + gameName,
                    password: gameAndDatabase.database.password,
                    database: 'game_' + gameName,
                    yourSql: null,
                    entities: this.getSubEntities(),
                    loadDefaultData: false
                });
                gameOrmHelper.sync((err) => {
                    if(err) {
                        reject(err);
                    }else {
                        this.gameOrmHelperMap[gameName] = gameOrmHelper;
                        resolve(this.gameOrmHelperMap[gameName]);
                    }
                });
                
            }else {
                resolve(this.gameOrmHelperMap[gameName]);
            }
            
        });
    }
}

module.exports = function(conf) {
    return new GameService(conf);
};
