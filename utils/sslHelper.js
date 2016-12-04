/* jshint node:true *//* global define, escape, unescape */
"use strict";

class SSLHelper {
  constructor(fs) {
	  this.fs = fs;
	  this.https = require('https');
  }
  
  configure(router) {
  	  var https = this.https;
	  console.log("Begin HTTPS server setup.");
	  if(https != undefined && https != null){
		  var sslKeyFile = process.env.sslKeyFile || './ssl/domain-key.pem';
	       console.log('sslKeyFile: ' + sslKeyFile);
	       
	       var sslDomainCertFile = process.env.sslDomainCertFile || './ssl/domain.org.crt';
	       console.log('sslDomainCertFile: ' + sslDomainCertFile);
	       
	       var sslCaBundleFile = process.env.ssCaBundleFile || './ssl/bundle.crt';
	       console.log('sslCaBundleFile: ' + sslCaBundleFile);
	       
	       var certFileEncoding = 'utf8';
	       
	       if (this.fs.existsSync(sslKeyFile) === false) {
	           console.log('sslKeyFile  was not found!');
	       }else if (this.fs.existsSync(sslDomainCertFile) === false) {
	           console.log('sslDomainCertFile  was not found!');
	       }
	       else{
	           var ssl = {
	                key: this.fs.readFileSync(sslKeyFile, certFileEncoding),
	                cert: this.fs.readFileSync(sslDomainCertFile, certFileEncoding)
	            };
	            
	            if (this.fs.existsSync(sslCaBundleFile)) {
	                console.log('sslCaBundleFile found.');
	                
	                var ca, cert, chain, line, _i, _len;
	            
	                ca = [];
	            
	                chain = this.fs.readFileSync(sslCaBundleFile, certFileEncoding);
	            
	                chain = chain.split("\n");
	            
	                cert = [];
	            
	                for (_i = 0, _len = chain.length; _i < _len; _i++) {
	                  line = chain[_i];
	                    if (!(line.length !== 0)) {
	                        continue;
	                    }
	                    
	                    cert.push(line);
	                    
	                    if (line.match(/-END CERTIFICATE-/)) {
	                      ca.push(cert.join("\n"));
	                      cert = [];
	                    }
	                }
	            
	                ssl.ca = ca;
	            }
	            
	            console.log('secureServer created');
	            return https.createServer(ssl, router);
	       }
		}else{
			console.log("Skipping HTTPS server setup.");
		}
	}
}

try {
    exports.SSLHelper = SSLHelper;
}
catch(err) {
    
}