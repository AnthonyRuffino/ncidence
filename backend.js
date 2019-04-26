class Backend {

    constructor({ common, cache, subdomain, broadcast, gameloop, storming }) {
        this._gameStartTime = Date.now();
        console.log(`[${subdomain}] Start game`, this._gameStartTime);
        this.common = common;
        this.cache = cache;
        this.subdomain = subdomain;
        this.broadcast = broadcast;
        this.gameloop = gameloop;
        this.storming = storming;
        this.frimScaler = .5;
        this.targetTickDelta = 0.0666;
        this.ofValue = require('of-value');

        this.getGameEntityRecord = (gameName, entityName, filter) => {
            return new Promise((resolve, reject) => {
                try {

                    if (!storming) {
                        console.log(gameName, `Error fetching model '[${entityName}]'`);
                        resolve(false);
                        return;
                    }

                    console.log('Getting game entity: ' + entityName + ' - [' + this.storming.database + ']');

                    if (!(storming.getMap()[entityName].model)) {
                        console.log(gameName, `Error fetching model '[${entityName}]'`);
                        resolve(false);
                        return;
                    }
                    storming.getMap()[entityName].model.find(filter, (err, entities) => {
                        if (err) {
                            console.log(`Game ${gameName}, Error fetching entity '[${entityName}]' with filter:`, filter, err);
                            resolve(false);
                            return;
                        }
                        if (!entities[0]) {
                            console.log(`Game: ${gameName}, Entity '[${entityName}]' not found after filter:`, filter);
                            resolve(false);
                            return;
                        }
                        resolve(entities);
                    });
                }
                catch (err) {
                    console.log(gameName, `Exception fetching model for '[${entityName}]'`, err);
                    resolve(false);
                }
            });
        };


        this.characterHelper = {
            find: ({ name, user }) => {
                return new Promise(async(resolve, reject) => {
                    let characters = await this.getGameEntityRecord(
                        subdomain,
                        'character', this.ofValue.stripUndefined({ name, user }));
                    if (!characters) {
                        resolve([]);
                    }
                    else {
                        const returnList = [];
                        characters.forEach((character) => {
                            returnList.push({ ...character,
                                data: () => {
                                    let buffer = Buffer.from(JSON.parse(JSON.stringify(character.data)).data).toString();
                                    //console.log('Character data loaded: ' + buffer);
                                    return JSON.parse(buffer.toString());
                                }
                            });
                        });
                        resolve(returnList);
                    }
                });
            }
        };

        this.startGameLoopImmediately = true;

        this.connections = {};
        this.userNameSessionMap = {};
        this.setPlayerControl = this.setPlayerControl.bind(this);
        this.update = this.update.bind(this);

        this.enemies = {};
        for (var i = 1; i <= 100; i++) {
            var enemyX = Math.random() * 1000 * (Math.random() > .5 ? -1 : 1);
            var enemyY = Math.random() * 1000 * (Math.random() > .5 ? -1 : 1);
            var enemyW = (Math.random() * 25) + 5;
            var enemyH = (Math.random() * 25) + 5;
            var enemyShape = Math.random() > .5 ? 'circle' : 'rectangle';
            var lineWidth = 3;
            this.enemies['enemy' + i] = new this.common.Entity({
                driver: this,
                type: 'enemy',
                id: 'enemy' + i,
                x: enemyX,
                y: enemyY,
                width: enemyW,
                height: enemyShape === 'circle' ? enemyW : enemyH,
                angle: 15,
                movementSpeed: 10,
                shape: enemyShape,
                fillStyle: this.common.CommonMath.getRandomColor(),
                lineWidth,
                strokeStyle: this.common.CommonMath.getRandomColor(),
                image: null
            });
        }
    }

    sessionKey(user) {
        return `${user.username}-${user.sessionId}`;
    }

    disconnectSocket({ ncidenceCookie, socketId }) {
        console.log('Socket disconnected: ' + socketId + ' - ' + ncidenceCookie);
    }

    update(delta, tag) {
        //if(updatePosition)
        //console.log('delta: ' + delta);
        this.frimScaler = delta / this.targetTickDelta;
        const updatedPlayers = [];
        if (this.connections) {
            Object.entries(this.connections).forEach((connection) => {
                const player = connection[1].player;
                player.updatePosition();
                if (player.motionDetected) {
                    updatedPlayers.push(player);
                    connection[1].emit('my-motion', {
                        x: player.x,
                        y: player.y,
                        angle: player.angle,
                    });
                }
            });
            if (updatedPlayers && updatedPlayers.length > 0) {
                updatedPlayers.forEach((other) => {
                    Object.entries(this.connections).forEach((connection) => {
                        if (connection[1].player.id !== other.id) {
                            connection[1].emit('other-motion', {
                                x: other.x,
                                y: other.y,
                                angle: other.angle,
                                id: other.id
                            });
                        }
                    });
                });
            }
        }
    }

    setPlayerControl(player, control, socketDebug) {
        player.controls[control.name](control.value)

    }

    getSocketIOHooks(console) {
        const socketIOHooks = [];
        socketIOHooks.push({
            on: 'control',
            run: ({ emit, dataIn, user }) => {
                //console.log('Control: ' + JSON.stringify(dataIn));
                if (this.connections) {
                    const playerOptional = this.connections[this.sessionKey(user)];
                    //TODO: what to do for anonymous?
                    if (!playerOptional) {
                        console.log('Who are you?');
                    }
                    else {
                        //console.log('Setting player control', playerOptional[0].player.id, dataIn);
                        this.setPlayerControl(playerOptional, dataIn, console.log);
                    }
                }
            }
        });
        socketIOHooks.push({
            on: 'hi',
            run: async({ emit, dataIn, user }) => {
                console.log(`${user.username}: 'hi' - isAnonymous: ${user.isAnonymous} - ncidenceCookie:${user.sessionId}`);
                // 	console.log('process.title', process.title);
                // 	console.log('GLOBALS', {
                // 	    __dirname,
                // 	    __filename,
                // 	    require
                // 	});
                // 	console.log('dataIn', dataIn);

                let player = null;
                const connectionOptional = this.connections[this.sessionKey(user)];
                //TODO: what to do for anonymous?
                if (!connectionOptional) {
                    const driver = {
                        renderer: {

                        },
                        gameEngine: this,
                        speedOfLight: 4479900

                    };

                    let characters = await this.characterHelper.find({ user: user.username });

                    const character = {
                        x: 1000,
                        y: 1000,
                        angle: 90
                    };
                    if (characters.length > 0) {
                        const characterData = characters[0].data();
                        character.x = characterData.x;
                        character.y = characterData.y;
                        character.angle = characterData.angle;
                    }

                    player = new this.common.Player({
                        driver: driver,
                        id: user.username,
                        x: character.x,
                        y: character.y,
                        width: 160,
                        height: 80,
                        angle: character.angle,
                        startAngle: 90,
                        movementSpeed: 360,
                        img: {}
                    });
                    driver.player = player;
                    const controls = new this.common.Controls(driver);

                    const baseInfo = player.baseInfo();
                    Object.entries(this.connections).forEach((connection) => {
                        connection[1].emit('joiner', { ...baseInfo, driver: null, img: null });
                        emit('joiner', { ...connection[1].player.baseInfo(), driver: null, img: null });
                    });
                    this.connections[this.sessionKey(user)] = { player, emit, controls };


                }
                else {
                    player = connectionOptional.player;
                    connectionOptional.emit = emit;

                    Object.entries(this.connections).forEach((connection) => {
                        if (connection[1].player.id !== player.id) {
                            emit('joiner', { ...connection[1].player.baseInfo(), driver: null, img: null });
                        }
                    });
                }

                const enemies = {}
                Object.entries(this.enemies).forEach((enemy) => {
                    enemies[enemy[0]] = { ...enemy[1].baseInfo(), driver: null }
                });
                emit('enemies', enemies);


                emit('hi', { ...player.baseInfo(), driver: null, img: null });


            }
        });
        return socketIOHooks;
    }
}

module.exports = Backend;
