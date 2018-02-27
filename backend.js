//SOCKET-IO 

//const logBkp = console.log;

exports.getBackend = ({
    console, 
    global,
    process = {},
    __dirname = '__dirname-not-supported', 
    __filename = '__filename-not-supported', 
    require = 'require-not-supported'
}) => {
    
    return class Backend {
        
        constructor({driverExports, cache, subdomain, broadcast}) {
            this.driverExports = driverExports;
            this.cache = cache;
            this.subdomain = subdomain;
            this.broadcast = broadcast;
        }
        
        getSocketIOHooks(){
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
                	console.log('ILLEGAL LOGGING - beep'); 
                	emit('beep', {text: 'beep', from: this.subdomain + '-Admin', username: username });
                }
            });
            socketIOHooks.push({
                on: 'hi',
                run: ({ emit, dataIn, username }) => {
                	console.log('hi', dataIn);
                	console.log('process.title', process.title);
                	console.log('GLOBALS', {
                	    __dirname,
                	    __filename,
                	    require
                	});
                	emit('hi', new this.driverExports.Hello(dataIn || 'from back end'));
                }
            });
            return socketIOHooks;
        };
    }
}



