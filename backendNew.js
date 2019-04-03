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
        
        this.startGameLoopImmediately = true;
        
        this.playersConnected = [];
        this.setPlayerControl = this.setPlayerControl.bind(this);
        this.update = this.update.bind(this);
    }
    
    update(delta, tag) {
        //if(updatePosition)
        if(this.playersConnected && this.playersConnected.length > 0) {
            this.playersConnected.forEach((player) => {
                if(!player.updatePosition) {
                    console.log('no updatePosition method on player object');
                } else {
                    player.updatePosition();
                }
            });
        }
    }
    
    setPlayerControl(player, control, socketDebug) {
        console.log(`This will go to server logs and not socket.`);
        console.log(`TODO: Decide if I like the ability to pass the socket bound console logging (socketDebug)`);
        if(socketDebug) {
            socketDebug(`Your controls were not really set, but we got so close.  TODO)`);
        }
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
                console.log('Control: ' + JSON.stringify(dataIn));
            	if(this.playersConnected && this.playersConnected.length > 0) {
            	    const playerOptional = this.playersConnected.filter((player) => player.id == username);
            	    //TODO: what to do for anonymous?
            	    if(!playerOptional || !playerOptional[0]) {
            	        console.log('Who are you?'); 
            	    } else {
            	        console.log('Setting player control', playerOptional[0].id, dataIn);
            	        this.setPlayerControl(playerOptional[0].id, dataIn, console.log);
            	    }
            	}
            }
        });
        socketIOHooks.push({
            on: 'hi',
            run: ({ emit, dataIn, username }) => {
                console.log('hi');
            	console.log('process.title', process.title);
            	console.log('GLOBALS', {
            	    __dirname,
            	    __filename,
            	    require
            	});
            	console.log('dataIn', dataIn);
            	//emit('hi', new this.common.Hello(dataIn || 'from back end'));
            	
            	const driver = {
            	    renderer: {
            	        
            	    },
            	    gameEngine: {
            	        frimScaler: 1
            	    },
            	    angleChangeSpeed: 2
            	    
            	};
            	const Image = {};
            	
            	//constructor(driver, id, x, y, width, height, angle, movementSpeed, img) {
            	const player = new this.common.Player(driver, username, 0, 0, 160, 80, 90, 30, Image);
            	driver.player = player;
            	this.playersConnected.push(player);
            	
            	console.log('Connecting player: ', username);
            	
            }
        });
        return socketIOHooks;
    }
};




