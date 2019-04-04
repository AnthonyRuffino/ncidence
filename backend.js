return class Backend {
    
    constructor({ common, cache, subdomain, broadcast, gameloop }) {
        console.log('---- common', common);
        this._gameStartTime = Date.now();
        console.log(`[${subdomain}] Start game`, this._gameStartTime);
        this.common = common;
        this.cache = cache;
        this.subdomain = subdomain;
        this.broadcast = broadcast;
        this.gameloop = gameloop;
        this.frimScaler = .5;
        this.targetTickDelta = 0.0666;
        
        this.startGameLoopImmediately = true;
        
        this.connections = [];
        this.setPlayerControl = this.setPlayerControl.bind(this);
        this.update = this.update.bind(this);
    }
    
    update(delta, tag) {
        //if(updatePosition)
        //console.log('delta: ' + delta);
        this.frimScaler = delta/this.targetTickDelta;
        const updatedPlayers = [];
        if(this.connections && this.connections.length > 0) {
            this.connections.forEach((connection) => {
                const player = connection.player;
                player.updatePosition();
                if(player.motionDetected) {
                    updatedPlayers.push(player);
                    connection.emit('my-motion', {
                        x: player.x,
                        y: player.y,
                        angle: player.angle,
                    });
                }
            });
            if(updatedPlayers && updatedPlayers.length > 0) {
                updatedPlayers.forEach((other) => {
                    this.connections.forEach((connection) => {
                        if(connection.player.id !== other.id) {
                            connection.emit('other-motion', {
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
            on: 'win',
            run: ({ emit, dataIn, username }) => {
            	this.broadcast({name: this.subdomain + '-Admin', text: "Win confirmed: " + username });
            }
        });
        socketIOHooks.push({
            on: 'beep',
            run: ({ emit, dataIn, username }) => {
            	console.log('Logging from server - beep'); 
            	emit('beep', {text: 'beep', from: this.subdomain + '-Admin', username: username });
            }
        });
        socketIOHooks.push({
            on: 'control',
            run: ({ emit, dataIn, username }) => { 
                //console.log('Control: ' + JSON.stringify(dataIn));
            	if(this.connections && this.connections.length > 0) {
            	    const playerOptional = this.connections.filter((player) => player.player.id == username);
            	    //TODO: what to do for anonymous?
            	    if(!playerOptional || !playerOptional[0]) {
            	        console.log('Who are you?'); 
            	    } else {
            	        //console.log('Setting player control', playerOptional[0].player.id, dataIn);
            	        this.setPlayerControl(playerOptional[0], dataIn, console.log);
            	    }
            	}
            }
        });
        socketIOHooks.push({
            on: 'hi',
            run: ({ emit, dataIn, username }) => {
                console.log(`${username}: 'hi'`);
            // 	console.log('process.title', process.title);
            // 	console.log('GLOBALS', {
            // 	    __dirname,
            // 	    __filename,
            // 	    require
            // 	});
            // 	console.log('dataIn', dataIn);
            	
            	let player = null;
            	const connectionOptional = this.connections && this.connections.length > 0 ? this.connections.filter((player) => player.player.id == username) : null;
        	    //TODO: what to do for anonymous?
        	    if(!connectionOptional || !connectionOptional[0]) {
        	        const driver = {
                	    renderer: {
                	        
                	    },
                	    gameEngine: this,
                	    speedOfLight: 4479900
                	    
                	};
                	
                	player = new this.common.Player({
                	    driver: driver,
                	    id: username,
                	    x: 1000,
                	    y: 1000,
                	    width: 160,
                	    height: 80,
                	    angle: 90,
                	    startAngle: 90,
                	    movementSpeed: 360,
                	    img: {}
                	});
                	driver.player = player;
                	const controls = new this.common.Controls(driver);
                	
                	const baseInfo = player.baseInfo();
                	this.connections.forEach((connection) => {
                	    connection.emit('joiner', {...baseInfo, driver: null, img: null});
                	    emit('joiner', {...connection.player.baseInfo(), driver: null, img: null});
                	});
                	this.connections.push({ player, emit, controls } );
                	
        	    } else {
        	        player = connectionOptional[0].player;
        	        connectionOptional[0].emit = emit;
        	        
        	        this.connections.forEach((connection) => {
        	            if(connection.player.id !== player.id) {
        	                emit('joiner', {...connection.player.baseInfo(), driver: null, img: null});
        	            }
                	});
        	    }
        	    
        	    emit('hi', {...player.baseInfo(), driver: null, img: null});
            	
            	
            }
        });
        return socketIOHooks;
    }
};




