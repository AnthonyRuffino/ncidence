"use strict";

class GameService {
    constructor({ ormHelper, yourSql, debug, secrets }) {
        this.ormHelper = ormHelper;
        this.yourSql = yourSql;
        this.debug = debug;
        this.uuidv4 = require('uuid/v4');
        this.gameOrmHelperMap = {};
        this.subEntityMap = {};
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


    getGame(name, fetchPassword) {
        return new Promise((resolve, reject) => {
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
                this.log(`Found game with name: ${name}`);
                games[0].getDatabase((err, database) => {
                    if (err) {
                        this.log(`Error getting games database info: ${name}`, err);
                        reject(err);
                        return;
                    }
                    this.log(`Found database info for game with name: ${name}`);
                    resolve({ game: games[0], database: { ...database, password: fetchPassword ? database.password : undefined } });
                });
            });
        });
    }


    getBlah(name) {
        return new Promise((resolve, reject) => {
            const gameOrmHelper = this.fetchCachedGameOrmHelper(name, false);
            gameOrmHelper['blah'].model.find({ name: 'blah' }, (err, blahs) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!blahs[0]) {
                    resolve({});
                    return;
                }
                resolve({ blah: blahs[0] });
            });
        });
    }

    async fetchCachedGameOrmHelper(name, refreshCache) {
        const game = await this.getGame(name, true);
        if (refreshCache || this.gameOrmHelperMap[name] === undefined || this.gameOrmHelperMap[name] === null) {
            const gameOrmHelper = require(global.__base + 'utils/ormHelper.js')({
                  ip: this.secrets.dbHost,
                  user: 'game_' + name,
                  password: game.database.password,
                  database: 'game_' + name,
                  yourSql: null,
                  entities: this.subEntityMap[name],
                  loadDefaultData: false
                });
            gameOrmHelper.sync();
            this.gameOrmHelperMap[name] = gameOrmHelper;
        }
        return this.gameOrmHelperMap[name];
    }

    createGame(name, userId, databasePassword){
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
                rootGameOrm.extensions['database'].create({ password: databasePassword, mb: 0, game: createdGame }, (err, createdExtension) => {
                    if(err) {
                        reject(err);
                        return;
                    }
                    resolve(createdGame);
                });
            });
        });
    }


    createGameAndSchema(name, userId, subEntities) {
        return new Promise(async (resolve, reject) => {
            try {
                this.subEntityMap[name] = subEntities;
                this.log(`createGame: ${name}`);
                const existingGame = await this.getGame(name, false);
                if (this.objectHasName(existingGame)) {
                    throw `A game name '${name}' already exists`;
                }
        
                this.log(`Creating new game: ${name}`);
                const databasePassword = this.uuidv4().substring(0, 13);
                const newGame = await this.createGame(name, userId, databasePassword);
                this.log(`Game created: ${name}`);
        
                const userAndSchemaName = 'game_' + name;
                await this.yourSql.createUser(userAndSchemaName, 'localhost', databasePassword);
                this.log(`User created: ${userAndSchemaName}`);
        
                await this.yourSql.createDatabase(userAndSchemaName);
                this.log(`Schema created: ${userAndSchemaName}`);

                const ormHelperTemp = require(global.__base + 'utils/ormHelper.js')({
                  ip: this.secrets.dbHost,
                  user: this.secrets.dbUser,
                  password: this.secrets.dbSecret,
                  database: userAndSchemaName,
                  yourSql: this.yourSql,
                  entities: subEntities,
                  loadDefaultData: true
                });
        
                ormHelperTemp.sync();
                this.log(`Schema synced: ${userAndSchemaName}`);
        
                await this.yourSql.grantAllCrudRightsToUserOnDatabase(userAndSchemaName, 'localhost', userAndSchemaName);
                this.log(`CRUD rights grated on schema: ${userAndSchemaName}`);
        
                this.fetchCachedGameOrmHelper(name, true);
        
                resolve(newGame);
            }catch(ex) {
                reject(ex);
            }
            
        });
        
    }
}

module.exports = function(conf) {
    return new GameService(conf);
};
