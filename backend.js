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
        this.mapplied = require("mapplied");
        this.sha256 = require('sha256');
        this.tick = 0;
        
        
        this.mapplied.init({
            hash:(val)=> this.sha256(val)
        }, subdomain);
        
        this.characterHelper = new (require("./game/characterHelper.js"))({ storming, subdomain });
        this.characterHelper.manageStrategy = () => {
            Object.entries(this.connections).forEach((connection) => {
                const manageKey = connection[1].manageKey;
                const player = connection[1].player;
                this.characterHelper.manageData(manageKey, {
                    x: player.x,
                    y: player.y,
                    angle: player.angle,
                });
            });
        };

        this.startGameLoopImmediately = true;

        this.connections = {};
        this.userNameSessionMap = {};
        this.setPlayerControl = this.setPlayerControl.bind(this);
        this.update = this.update.bind(this);
        
        this.gameNumber = 0;
        this.resetEnemies();
        
        setInterval(() => {
            this.resetEnemies();
        }, 1000*this.common.Constants.waveTimeSec);
        
        
        
        setInterval(() => {
            this.emitEnemies(true);
        }, 6000);
        
        
        
    }
    
    emitEnemies(isSync) {
        Object.entries(this.connections).forEach(conn => {
            const enemies = {};
            Object.entries(this.enemies).forEach((enemy) => {
                enemies[enemy[0]] = { ...enemy[1].baseInfo(), driver: null };
            });
            conn[1].emit('enemies', {enemies, gameNumber: this.gameNumber, isSync});
        });
    }
    
    
    resetEnemies() {
        
        if(this.gameNumber > 15) {
            this.gameNumber = 0;
        }
        
        this.mapplied.init({
            hash:(val)=> this.sha256(val)
        }, this.subdomain + (this.gameNumber ? this.gameNumber : ''));
        this.gameNumber++;
        
        const activationTime = Date.now() + (2.5 * 1000);
        
        const universe = this.mapplied.getUniverse();
        const hashAnalysis = universe.hashAnalysis;
        
        const numVal = (index) => {
            if(index > hashAnalysis.numberCount) {
                index = index % hashAnalysis.numberCount;
            }
            if(index === 0) {
                index = 1;
            }
            const num = hashAnalysis.numbers[index + ''];
            return num.val;
        };
        let enemyCount = 100 - (numVal(1) * 10) - numVal(2);
        let additionalReds = Math.round(enemyCount < 30 ? enemyCount * 1.25 : enemyCount * .25);
        this.enemies = {};
        for (var i = 1; i <= (enemyCount + additionalReds); i++) {
            
            const mapliedFactor1 = numVal(i);
            const mapliedFactor2 = numVal(i + 1);
            
            var enemyX = (1000 - ((i - 1) * mapliedFactor1)) * (mapliedFactor1%2 ? -1 : 1);
            var enemyY = (1000 - ((i - 1) * mapliedFactor2)) * (mapliedFactor2%2 ? -1 : 1);
            var enemyW = ((mapliedFactor1/10) * 25) + 15;
            var enemyH = ((mapliedFactor2/10) * 25) + 15;
            var enemyShape = i%2 ? 'circle' : 'rectangle';
            var lineWidth = 1;
            
            var colorIndexes = i > enemyCount ? 0 : mapliedFactor1%3;
            colorIndexes = colorIndexes === 0 ? {name: 'red', data: [0,1]} : (colorIndexes === 1 ? {name: 'green', data: [2,3]} : {name: 'blue', data: [4,5]});
            
            const currentColor = this.common.CommonMath.getRandomColor((index)=>colorIndexes.data.indexOf(index)>-1 ? 15 : 0);
            this.enemies['enemy' + i] = new this.common.Entity({
                driver: this,
                type: colorIndexes.name + '-enemy',
                id: 'enemy' + i,
                x: enemyX,
                y: enemyY,
                width: enemyW,
                height: enemyShape === 'circle' ? enemyW : enemyH,
                angle: 15,
                movementSpeed: 20,
                shape: enemyShape,
                fillStyle: currentColor,
                lineWidth,
                strokeStyle: 'dark-' + colorIndexes.name,
                image: null,
                wiggleX: 1,
                wiggleY: 1,
                activationTime
            });
        }
        
        this.emitEnemies(false);
    }

    sessionKey(user, socketId) {
        return `${user.sessionId}`;
    }

    disconnectSocket({ appCookie, socketId }) {
        console.log('Socket disconnected: ' + socketId + ' - ' + appCookie);
        const conn = this.connections[this.sessionKey({sessionId:appCookie}, socketId)];
        if(conn) {
            conn.disconnected = new Date();
        }
    }
    
    considerForTargeting(player, last, now){
        const movedEnemies = {};
        Object.entries(this.enemies).forEach((enemy) => {
            if(now >= enemy[1].activationTime && enemy[1].type.indexOf('red')+1 && !enemy[1].kill) {
                
                var newTargetXDistance = enemy[1].x - player.x;
                var newTargetYDistance = enemy[1].y - player.y;
                const newDistance = Math.sqrt( newTargetXDistance*newTargetXDistance + newTargetYDistance*newTargetYDistance );
                
                if(newDistance < 5000) {
                    if(!enemy[1].target) {
                        enemy[1].target = player;
                        enemy[1].initialTarget = true;
                    }
                    var oldTargetXDistance = enemy[1].x - enemy[1].target.x;
                    var oldTargetYDistance = enemy[1].y - enemy[1].target.y;
                    const oldDistance = Math.sqrt( oldTargetXDistance*oldTargetXDistance + oldTargetYDistance*oldTargetYDistance );
                    const aggroRangeMemory = (100/enemy[1].width)*400;
                    if(enemy[1].target.id !== player.id && ((oldDistance > aggroRangeMemory) || enemy[1].initialTarget)) {
                        
                        if(newDistance < oldDistance) {
                            enemy[1].target = player;
                        }
                        
                        if(last) {
                            enemy[1].initialTarget = false;
                        }
                    }
                }
            }
        });
        return movedEnemies;
    }
    
    
    moveEnemies(enemies){
        const movedEnemies = {};
        const killedEnemies = {};
        Object.entries(enemies).forEach((enemy) => {
            if(enemy[1].target) {
                const speed = (100*(1/enemy[1].width));
                enemy[1].x += speed*(enemy[1].target.x > enemy[1].x ? 1 : -1);
                enemy[1].y += speed*(enemy[1].target.y > enemy[1].y ? 1 : -1);
                movedEnemies[enemy[0]] = {
                    id: enemy[0],
                    x: enemy[1].x,
                    y: enemy[1].y
                };
            } else if(enemy[1].type === 'bullet') {
                
                const killedEnemiesTemp = enemy[1].entity.projectileMotion(this.enemies, false, enemy[1]);
                if(Object.entries(killedEnemiesTemp).length && enemy[1].duration === 0) {
                    enemy[1].duration
                   enemy[1].lifeSpan = 0;
                }
                Object.entries(killedEnemiesTemp).forEach(killed => {
                    killedEnemies[killed[0]] = {
                        id: killed[0],
                        x: killed[1].x,
                        y: killed[1].y,
                        type: killed[1].type,
                        kill: true
                    };
                });
                movedEnemies[enemy[1].entity.id] = {...enemy[1].entity.baseInfo(), driver: {}, age: enemy[1].age, lifeSpan: enemy[1].lifeSpan};
            }
        });
        return {movedEnemies, killedEnemies};
    }

    update(delta, tag) {
        this.tick++;
        const now = Date.now();
        //if(updatePosition)
        //console.log('delta: ' + delta);
        this.frimScaler = delta / this.targetTickDelta;
        const updatedPlayers = [];
        const disconectedPlayers = [];
        let movedEnemies = this.moveEnemies(this.enemies).movedEnemies;
        let killedEnemies = {};
        let movedProjectiles = {};
        if (this.connections) {
            let check = 0;
            Object.entries(this.connections).forEach((connection) => {
                if(this.tick%10 === 0) {
                    check++;
                    const last = check === Object.entries(this.connections).length;
                    this.considerForTargeting(connection[1].player, last, now);
                }
                const player = connection[1].player;
                
                if(this.tick%100===0) {
                    player.updateDistanceScaler();
                }
                
                const attackingEnemiesTemp = player.projectileMotion(this.enemies, true);
                
                if(Object.entries(attackingEnemiesTemp).length > 0) {
                    Object.values(attackingEnemiesTemp).forEach(enemy => {
                        if(now > enemy.activationTime) {
                            if(enemy.type.indexOf('green') === 0) {
                                player.hp++;
                            } else {
                                player.hp -= 2;
                            }
                        }
                    });
                    connection[1].emit('damage', {
                        hp: player.hp,
                        damageSource:'enemies'
                    });
                    player.checkHp({damageSource:'enemies'});
                }
                
                const projectileData = this.moveEnemies(player.popProjectiles());
                const projectiles = projectileData.movedEnemies;
                killedEnemies = projectileData.killedEnemies;
                
                Object.entries(projectileData.killedEnemies).forEach(killedEnemy => {
                    player.score++;
                    movedEnemies[killedEnemy[0]] = killedEnemy[1];
                    
                    if(killedEnemy[1].type.indexOf('green') === 0) {
                        player.hp += 3;
                        player.baseSpeed += 1;
                    } else if(killedEnemy[1].type.indexOf('blue') === 0) {
                        player.baseSpeed -= 1;
                        player.baseSpeed = player.baseSpeed > 0 ? player.baseSpeed : 10;
                        player.score++;
                    }
                    
                });
                
                connection[1].emit('score', {
                    score: player.score,
                    baseSpeed: player.baseSpeed,
                    hp: player.hp
                });
                
                if(Object.keys(projectiles).length > 0) {
                    Object.entries(projectiles).forEach(entry => {
                        movedProjectiles[entry[0]] = entry[1];
                    });
                }
                
                player.updatePosition();
                if (player.motionDetected) {
                    updatedPlayers.push(connection);
                    connection[1].emit('my-motion', {
                        x: player.x,
                        y: player.y,
                        angle: player.angle,
                        baseSpeed: player.baseSpeed
                    });
                } else if(connection[1].disconnected && (((new Date()) - connection[1].disconnected) > 1000)){
                    connection.disconnect = true;
                    updatedPlayers.push(connection);
                    disconectedPlayers.push(connection);
                }
                
            });
            
            
            const playerMovement = updatedPlayers && updatedPlayers.length;
            const bulletsFlying = Object.keys(movedProjectiles).length;
            disconectedPlayers.forEach((connection) => {
                delete this.connections[connection[0]];
            });
            Object.entries(this.connections).forEach((connection) => {
                
                if((this.tick%2 === 0) && Object.keys(movedEnemies).length > 0) {
                    connection[1].emit('enemy-motion', movedEnemies);
                }
                
                if(Object.keys(killedEnemies).length > 0) {
                    connection[1].emit('enemy-motion', killedEnemies);
                }
                
                if((this.tick%2 === 0) && bulletsFlying) {
                    connection[1].emit('projectile-motion', movedProjectiles);
                }
                if (playerMovement) {
                    updatedPlayers.forEach((other) => {
                        const otherPlayer = other[1].player;
                        if (connection[1].player.id !== otherPlayer.id) {
                            connection[1].emit('other-motion', {
                                x: otherPlayer.x,
                                y: otherPlayer.y,
                                angle: otherPlayer.angle,
                                id: otherPlayer.id,
                                disconnect: other[1].disconnect
                            });
                        }
                    });
                }
            });
        }
    }

    setPlayerControl(player, control, socketDebug) {
        player.controls[control.name](control.value);

    }

    getSocketIOHooks(console) {
        const socketIOHooks = [];
        socketIOHooks.push({
            on: 'control',
            run: ({ emit, dataIn, user, socketId }) => {
                //console.log('Control: ' + JSON.stringify(dataIn));
                if (this.connections) {
                    const playerOptional = this.connections[this.sessionKey(user, socketId)];
                    //TODO: what to do for anonymous?
                    if (!playerOptional) {
                        console.log('Who are you?');
                    }
                    else {
                        //console.log('Setting player control', playerOptional.player.id, dataIn);
                        this.setPlayerControl(playerOptional, dataIn, console.log);
                    }
                }
            }
        });
        
        const renderer = {
            scale: .2,
            startScale: .2
        };
        socketIOHooks.push({
            on: 'hi',
            run: async({ emit, dataIn, user, socketId }) => {
                console.log(`${user.username}: 'hi' - isAnonymous: ${user.isAnonymous} - ncidenceCookie:${user.sessionId}`);

                let player = null;
                const connectionOptional = this.connections[this.sessionKey(user, socketId)];
                //TODO: what to do for anonymous?
                if (!connectionOptional) {
                    const driver = {
                        renderer,
                        gameEngine: this,
                        socket: {
                            emit
                        }
                    };
                    
                    const userName = user.isAnonymous ? `?_${user.sessionId}` : user.username;

                    let characters = await this.characterHelper.findCharacters({ user: userName });

                    const character = {
                        x: 1000,
                        y: 1000,
                        angle: 90
                    };
                    
                    let characterEntity;
                    if (characters.length > 0) {
                        characterEntity = characters[0].raw;
                        const characterData = characters[0].deserialized.data();
                        character.x = characterData.x;
                        character.y = characterData.y;
                        character.angle = characterData.angle;
                    } else {
                        characterEntity = await this.characterHelper.createCharacter({ name: user.username, user: userName, data: character });
                        console.log('charater created');
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
                        img: {},
                        hp: 1000,
                        score: 0
                    });
                    driver.player = player;
                    const controls = new this.common.Controls(driver);
                    
                    
                    this.characterHelper.manage({
                        character: characterEntity, 
                        latest: () => ({
                            x: player.x,
                            y: player.y,
                            angle: player.angle
                        })
                    });

                    const baseInfo = player.baseInfo();
                    Object.entries(this.connections).forEach((connection) => {
                        connection[1].emit('joiner', { ...baseInfo, driver: null, img: null });
                        emit('joiner', { ...connection[1].player.baseInfo(), driver: null, img: null });
                    });
                    this.connections[this.sessionKey(user, socketId)] = { player, emit, controls };


                }
                else {
                    player = connectionOptional.player;
                    connectionOptional.emit = emit;
                    player.driver.renderer = renderer;

                    Object.entries(this.connections).forEach((connection) => {
                        if (connection[1].player.id !== player.id) {
                            emit('joiner', { ...connection[1].player.baseInfo(), driver: null, img: null });
                        }
                    });
                    connectionOptional.disconnected = null;
                }
                
                

                const enemies = {}
                Object.entries(this.enemies).forEach((enemy) => {
                    enemies[enemy[0]] = { ...enemy[1].baseInfo(), driver: null }
                });
                emit('enemies', {enemies, gameNumber: this.gameNumber});


                emit('hi', {
                    playerData: { ...player.baseInfo(), img: null },
                    gameStartTimeServer: this._gameStartTime,
                    renderer: renderer
                });


            }
        });
        return socketIOHooks;
    }
}

module.exports = Backend;
