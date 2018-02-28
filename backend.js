return class Backend {
    
    constructor({common, cache, subdomain, broadcast}) {
        console.log('---- common?common?common', common);
        this.common = common;
        this.cache = cache;
        this.subdomain = subdomain;
        this.broadcast = broadcast;
    }
    
    getSocketIOHooks(console){
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
            	emit('hi', new this.common.Hello(dataIn || 'from back end'));
            }
        });
        return socketIOHooks;
    }
};




