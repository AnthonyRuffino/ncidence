//SOCKET-IO 

exports.getSocketIOHooks = () => {
    const socketIOHooks = [];
    socketIOHooks.push({
        on: 'win',
        run: ({ emit, dataIn, username, subdomain, broadcast, driverExports, cache }) => {
        	broadcast({name: subdomain + '-Admin', text: "Win confirmed: " + username })
        }
    });
    socketIOHooks.push({
        on: 'check-loss',
        run: ({ emit, dataIn, username, subdomain, broadcast, driverExports, cache }) => {
        	console.log('ILLEGAL LOGGING'); 
        	emit('youlose', {text: 'You lose!', from: subdomain + '-Admin', username: username });
        }
    });
    socketIOHooks.push({
        on: 'check-loss',
        run: ({ emit, dataIn, username, subdomain, broadcast, driverExports, cache }) => {
        	emit('load', new driverExports.Dummy('fff')) 
        }
    });
}

