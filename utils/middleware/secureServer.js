'use strict'

module.exports = function(fs, router) {
    let useHttps = false;
    let secureServer = null;
    
    if (process.env.SECURE_PORT !== undefined && process.env.SECURE_PORT !== null) {
      console.log('Using SSL.');
      let sslHelper = require(global.__rootdir + 'utils/sslHelper.js')(fs);
      try {
        secureServer = sslHelper.configure(router);
      }
      catch (err) {
        secureServer = null;
        console.log('Error creating https server: ' + err);
      }
      useHttps = secureServer !== null;
    }
    else {
      console.log('Not using SSL.');
    }
    
    console.log('Enable Middleware');
    if (useHttps === true) {
      router.use('redirect-secure');
    }
    
    return secureServer;
}