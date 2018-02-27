//SOCKET-IO 

//const logBkp = console.log;



exports.getSocketIOHooks = () => {
    const socketIOHooks = [];
    socketIOHooks.push({
        on: 'win',
        run: ({ emit, dataIn, username, subdomain, broadcast, driverExports, cache }) => {
        	broadcast({name: subdomain + '-Admin', text: "Win confirmed: " + username });
        }
    });
    socketIOHooks.push({
        on: 'beep',
        run: ({ emit, dataIn, username, subdomain, broadcast, driverExports, cache }) => {
        	console.log('ILLEGAL LOGGING - beep'); 
        	emit('beep', {text: 'beep', from: subdomain + '-Admin', username: username });
        }
    });
    socketIOHooks.push({
        on: 'hi',
        run: ({ emit, dataIn, username, subdomain, broadcast, driverExports, cache }) => {
        	console.log('hi', dataIn);
        	emit('hi', new driverExports.Hello(dataIn || 'from back end'));
        }
    });
    return socketIOHooks;
};

