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
        
        const universe = this.mapplied.getUniverse();
        
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

        const enemyCount = 100 - (numVal(1) * 10) - numVal(2);
        this.enemies = {};
        for (var i = 1; i <= enemyCount; i++) {
            
            const mapliedFactor1 = numVal(i);
            const mapliedFactor2 = numVal(i + 1);
            
            var enemyX = (1000 - ((i - 1) * mapliedFactor1)) * (mapliedFactor1%2 ? -1 : 1);
            var enemyY = (1000 - ((i - 1) * mapliedFactor2)) * (mapliedFactor2%2 ? -1 : 1);
            var enemyW = ((mapliedFactor1/10) * 25) + 15;
            var enemyH = ((mapliedFactor2/10) * 25) + 15;
            var enemyShape = i%2 ? 'circle' : 'rectangle';
            var lineWidth = 3;
            
            var colorIndexes = mapliedFactor1%3;
            colorIndexes = colorIndexes === 0 ? {name: 'red', data: [0,1]} : (colorIndexes === 1 ? {name: 'green', data: [2,3]} : {name: 'blue', data: [4,5]});
            
            this.enemies['enemy' + i] = new this.common.Entity({
                driver: this,
                type: colorIndexes.name + '-enemy',
                id: 'enemy' + i,
                x: enemyX,
                y: enemyY,
                width: enemyW,
                height: enemyShape === 'circle' ? enemyW : enemyH,
                angle: 15,
                movementSpeed: 10,
                shape: enemyShape,
                fillStyle: this.common.CommonMath.getRandomColor((index)=>colorIndexes.data.indexOf(index)>-1 ? ((mapliedFactor1*mapliedFactor2)%15) : 0),
                lineWidth,
                strokeStyle: this.common.CommonMath.getRandomColor(),
                image: null,
                wiggleX: 1,
                wiggleY: 1
            });
        }
    }

    sessionKey(user) {
        return `${user.username}-${user.sessionId}`;
    }

    disconnectSocket({ ncidenceCookie, socketId }) {
        console.log('Socket disconnected: ' + socketId + ' - ' + ncidenceCookie);
    }
    
    considerForTargeting(player){
        const movedEnemies = {};
        Object.entries(this.enemies).forEach((enemy) => {
            if(enemy[1].type.indexOf('red')+1) {
                if(!enemy[1].target) {
                    enemy[1].target = player;
                }
                var oldTargetXDistance = enemy[1].x - enemy[1].target.x;
                var oldTargetYDistance = enemy[1].y - enemy[1].target.y;
                const oldDistance = Math.sqrt( oldTargetXDistance*oldTargetXDistance + oldTargetYDistance*oldTargetYDistance );
                const aggroRangeMemory = (100/enemy[1].width)*400;
                if(enemy[1].target.id !== player.id && (oldDistance > aggroRangeMemory)) {
                    var newTargetXDistance = enemy[1].x - player.x;
                    var newTargetYDistance = enemy[1].y - player.y;
                    
                    const newDistance = Math.sqrt( newTargetXDistance*newTargetXDistance + newTargetYDistance*newTargetYDistance );
                    if(newDistance < oldDistance) {
                        enemy[1].target = player;
                    }
                }
            }
        });
        return movedEnemies;
    }
    
    
    moveEnemies(enemies){
        const movedEnemies = {};
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
                enemy[1].entity.projectileMotion();
                movedEnemies[enemy[1].entity.id] = {...enemy[1].entity.baseInfo(), driver: {}, age: enemy[1].age, lifeSpan: enemy[1].lifeSpan};
            }
        });
        return movedEnemies;
    }

    update(delta, tag) {
        this.tick++;
        //if(updatePosition)
        //console.log('delta: ' + delta);
        this.frimScaler = delta / this.targetTickDelta;
        const updatedPlayers = [];
        let movedEnemies = this.moveEnemies(this.enemies);
        let movedProjectiles = {};
        if (this.connections) {
            Object.entries(this.connections).forEach((connection) => {
                if(this.tick%100 === 0) {
                    this.considerForTargeting(connection[1].player);
                }
                const player = connection[1].player;
                
                const projectiles = this.moveEnemies(player.popProjectiles());
                if(Object.keys(projectiles).length > 0) {
                    Object.entries(projectiles).forEach(entry => {
                        movedProjectiles[entry[0]] = entry[1];
                    });
                }
                
                player.updatePosition();
                if (player.motionDetected) {
                    updatedPlayers.push(player);
                    connection[1].emit('my-motion', {
                        x: player.x,
                        y: player.y,
                        angle: player.angle,
                        baseSpeed: player.baseSpeed
                    });
                }
                if((this.tick%2 === 0) && Object.keys(movedEnemies).length > 0) {
                    connection[1].emit('enemy-motion', movedEnemies);
                }
            });
            
            
            const playerMovement = updatedPlayers && updatedPlayers.length;
            const bulletsFlying = Object.keys(movedProjectiles).length;
            if (playerMovement || bulletsFlying) {
                Object.entries(this.connections).forEach((connection) => {
                    if((this.tick%2 === 0) && bulletsFlying) {
                        connection[1].emit('projectile-motion', movedProjectiles);
                    }
                    if (playerMovement) {
                        updatedPlayers.forEach((other) => {
                            if (connection[1].player.id !== other.id) {
                                connection[1].emit('other-motion', {
                                    x: other.x,
                                    y: other.y,
                                    angle: other.angle,
                                    id: other.id
                                });
                            }
                        });
                    }
                });
            }
        }
    }

    setPlayerControl(player, control, socketDebug) {
        player.controls[control.name](control.value);

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
                        //console.log('Setting player control', playerOptional.player.id, dataIn);
                        this.setPlayerControl(playerOptional, dataIn, console.log);
                    }
                }
            }
        });
        socketIOHooks.push({
            on: 'hi',
            run: async({ emit, dataIn, user }) => {
                console.log(`${user.username}: 'hi' - isAnonymous: ${user.isAnonymous} - ncidenceCookie:${user.sessionId}`);

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
                        img: {}
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


                emit('hi', {
                    playerData: { ...player.baseInfo(), driver: null, img: null }, 
                    gameStartTimeServer: this._gameStartTime 
                });


            }
        });
        return socketIOHooks;
    }
}

module.exports = Backend;
