console.log('..........................................................');
console.log('..........................................................');
console.log('..........................................................');
console.log('....................@Launching Ncidence@..................');
console.log('........................................................');
console.log('......................................................');
console.log('....................................................');
console.log('..................................................');
console.log('................................................');
console.log('..............................................');
console.log('............................................');
console.log('..........................................');
console.log('........................................');
console.log('......................................');
console.log('....................................');
console.log('..................................');
console.log('................................');
console.log('..............................');
console.log('............................');

var DEFAULT_HOST = process.env.DEFAULT_HOST || 'ncidence_org';
var publicdir = __dirname + '/client';

var http = require('http');
var path = require('path');

var async = require('async');

var express = require('express');

var fs = require('fs');
var mkpath = require('mkpath');
var moment = require('moment-timezone');

var guid = require('./utils/guid.js');





//////////////////////
//BEGIN MYSQL CONFIG
//////////////////////
var mySqlHelper = new (require('./utils/mySqlHelper.js')).MySqlHelper();
var mySqlIp = process.env.MYSQL_PORT_3306_TCP_ADDR || 'localhost';
var mySqlUser= process.env.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root';
var mySqlPassword = process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD || null;
var mySqlConnection = null;

//host, user, password, database
mySqlHelper.init(mySqlIp, mySqlUser, mySqlPassword, 'mysql');



//START To Default Host Database.  COnnect to 'mysql' schema first
if(mySqlIp !== null && mySqlIp !== undefined){
  console.log('LOADING mysql. ');
  mySqlHelper.createDatabase(DEFAULT_HOST);
}else{
  console.log('mysql NOT LOADED. ');
}



//////////////////////
//END MYSQL CONFIG
//////////////////////

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
console.log('############# ConfigureRouter');
var router = express();
router.use(express.bodyParser());
var server = http.createServer(router);
var secureServer = null;



//////////////////////
//BEGIN HTTPS CONFIG
//////////////////////
var useHttps = false;
var secureServerErr = null;

if(process.env.SECURE_PORT !== undefined && process.env.SECURE_PORT !== null){
  console.log('Using SSL.');  
  var sslHelper = new (require('./utils/sslHelper.js')).SSLHelper(fs);
  try{
  	secureServer = sslHelper.configure(require('https'));
   }catch(err){
	   secureServer = null;
       secureServerErr = "Err1: " + err;
       console.log('Error creating https server: ' + err);
   }
   useHttps = secureServer !== null;
}else{
  console.log('Not using SSL.');
}
//////////////////////
//END HTTPS CONFIG
//////////////////////







//////////////////////////
//BEGIN MIDDLEWARE///
//////////////////////////
console.log('############# MIDDLEWARE');
if(useHttps === true){
    router.use(function requireHTTPS(req, res, next) {
        if (!req.secure) {
            return res.redirect('https://' + req.get('host') + req.url);
        }
        next();
    });
}

var fauxIndexHtmlObj = new (require('./utils/middleware/fauxIndexHtml.js')).FauxIndexHtml(publicdir);
router.use(function(req, res, next) {fauxIndexHtmlObj.process(req,res,next)});

router.use(express.static(publicdir));
//////////////////////////
//END MIDDLEWARE///
//////////////////////////



//////////////////////////
//BEGIN SOCKET IO SETUP///
//////////////////////////
console.log('############# SOCKET IO');
var socketIOHelper = new (require('./utils/socketIOHelper.js')).SocketIOHelper(secureServer !== null ? secureServer : server);
socketIOHelper.init();
//////////////////////////
//END SOCKET IO SETUP///
//////////////////////////

console.log('############# /api/db');
router.get('/api/db', function(req, res) {
    if(req.query.psw !== undefined && req.query.psw !== null && req.query.psw === process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD){
      console.log('######################/api/db');
      
      mySqlHelper.query(req.query.sql, function(success, error){
    	  if(error){
    		  res.json(200, error);
    	  }else{
    		  res.json(200, success);
    	  }
      });
    }else{
      if(req.query.psw !== undefined && req.query.psw !== null){
        res.json(200, { err: 'try again' });
      }else{
        res.json(200, { err: 'not authorized' });
      }
    }
});


console.log('############# /api/init-db');
router.get('/api/init-db', function(req, res) {
    console.log('######################/api/init-db');
    try{
    	mySqlHelper.createDatabase(DEFAULT_HOST); 
    }catch(ex){
        res.json(200, { err: 'mysql connection error: ' + ex });
    }
});

router.get('/api/guid', function(req, res) {
    res.json(200, {guid:guid.generate(req.query.useDashes)});
});





server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  console.log('trying to listen...');
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
