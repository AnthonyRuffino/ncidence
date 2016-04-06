//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var publicdir = __dirname + '/client';

var removeTrailingHtml = true;

var path = null;

if(removeTrailingHtml === false){
    path = require('path');
}



var fs = require('fs');
var http = require('http');
var mkpath = require('mkpath');
var moment = require('moment-timezone');

var https = null;
var useHttps = false;

if(process.env.SECURE_PORT !== undefined && process.env.SECURE_PORT !== null){
    console.log('useHttps was set to true.');
    useHttps = true;
    https = require('https');
}else{
    console.log('useHttps was not set to true.');
}


var mySqlIp = process.env.MYSQL_PORT_3306_TCP_ADDR || null;
var mySqlConnection = null;

if(mySqlIp !== null && mySqlIp !== null){
    try {
         var mysqlClient = require('mysql');
         mySqlConnection = mysqlClient.createConnection({
             host: mySqlIp,
             user: process.env.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root',
             password: process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD,
             database : process.env.MYSQL_ENV_MYSQL_DATABASE_NAME || 'ncidence'
         });
    }catch (e) {
        console.log('FAILED TO LOAD mysql. ');
        console.log(e)
    }
}







var async = require('async');
var socketio = require('socket.io');
var express = require('express');
//var bcrypt = require('bcrypt');
//var keyDel = require('key-del');

var guid = require('./utils/guid.js');
var strikeTemp = require('./beer/strikeTemp.js');

var mapplied = require('./utils/mapplied.js');
var sha256 = require('./client/js/hashing/sha256/sha256.js');

mapplied.init(sha256, guid);

//var chatSocketIOc9 = require('./client/app/chat.js');
var socketHub = require('./client/app/socketHub.js');
var callLogger = require('./client/app/callLogger.js');
var chatter = require('./client/app/chatter.js');
var socketIO_OnConnectionProvider = socketHub;

var socketIOconnectionData = {};
socketIOconnectionData.async = async;
socketIOconnectionData.guid = guid;
socketIOconnectionData.fs = fs;
socketIOconnectionData.dirname = __dirname + "/logs/mathers";
socketIOconnectionData.mkpath = mkpath;
socketIOconnectionData.path = require('path');
socketIOconnectionData.moment = moment;
socketIOconnectionData.children = [];
socketIOconnectionData.children.push(callLogger);
socketIOconnectionData.children.push(chatter);

socketIO_OnConnectionProvider.init(socketIOconnectionData);


var database = {};


var monty = require('./monty/monty.js');


//var getIp = require('ipware')().get_ip;
var getIp = function getIp(req){
    var ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
     
     var clientIp = {clientIp:ip};
     
     return clientIp;
};




//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
router.use(express.bodyParser());

var server = null;
var secureServer = null;


var secureServerErr = null;


if(useHttps === true && https != null){
   try{
       
       var sslKeyFile = process.env.sslKeyFile || './ssl/domain-key.pem';
       console.log('sslKeyFile: ' + sslKeyFile);
       
       var sslDomainCertFile = process.env.sslDomainCertFile || './ssl/domain.org.crt';
       console.log('sslDomainCertFile: ' + sslDomainCertFile);
       
       var sslCaBundleFile = process.env.ssCaBundleFile || './ssl/bundle.crt';
       console.log('sslCaBundleFile: ' + sslCaBundleFile);
       
       var certFileEncoding = 'utf8';
       
       if (fs.existsSync(sslKeyFile) === false) {
           console.log('sslKeyFile  was not found!');
       }else if (fs.existsSync(sslDomainCertFile) === false) {
           console.log('sslDomainCertFile  was not found!');
       }
       else{
           var ssl = {
                key: fs.readFileSync(sslKeyFile, certFileEncoding),
                cert: fs.readFileSync(sslDomainCertFile, certFileEncoding)
            };
            
            if (fs.existsSync(sslCaBundleFile)) {
                console.log('sslCaBundleFile found.');
                
                var ca, cert, chain, line, _i, _len;
            
                ca = [];
            
                chain = fs.readFileSync(sslCaBundleFile, certFileEncoding);
            
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
            
            secureServer = https.createServer(ssl, router);
            console.log('secureServer created');
       }
       

    }catch(err){
        secureServerErr = "Err1: " + err;
        console.log('Error creating https server: ' + err);
    } 
}


//////////////////////////
//BEGIN SOCKET IO SETUP///
//////////////////////////
if(useHttps === true && secureServer != null){
    socketio.listen(secureServer).on('connection', socketIO_OnConnectionProvider.onConnection);
}
else{
    if(server === undefined || server === null){
        server = http.createServer(router);
    }
    socketio.listen(server).on('connection', socketIO_OnConnectionProvider.onConnection);
}
//////////////////////////
//END SOCKET IO SETUP///
//////////////////////////



//////////////////////////
//BEGIN MIDDLEWARE///
//////////////////////////
function requireHTTPS(req, res, next) {
    if (!req.secure) {
        return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
}

if(useHttps === true){
    router.use(requireHTTPS);
}

//This allows for navigation to html pages without the .html extension
if(removeTrailingHtml === true || (path === undefined || path === null)){
    router.use(function(req, res, next) {
        if (req.path.indexOf('.') === -1) {
            var file = publicdir + req.path + '.html';
            fs.exists(file, function(exists) {
              if (exists)
                req.url += '.html';
              next();
            });
        }
        else{
           next(); 
        }
    });
    router.use(express.static(publicdir));
}else{
    router.use(express.static(path.resolve(__dirname, 'client')));
}
//////////////////////////
//END MIDDLEWARE///
//////////////////////////




////////////////////////////
//BEGIN CONTROLLER ROUTES///
////////////////////////////
router.get('/api/secret', function(req, res) {
    res.json(200, {test:'val2'});
});


router.get('/api/montyStats', function(req, res) {
    res.json(200, monty.getMontyStats(req.query.players, req.query.games));
});


router.get('/api/playMontyGame', function(req, res) {
    res.json(200, monty.playMontyGame(req.query.doorNumber,req.query.doSwitch));
});

router.get('/api/secureServerErr', function(req, res) {
    res.json(200, {secureServerErr:secureServerErr, useHttps:useHttps});
});

router.get('/api/guid', function(req, res) {
    res.json(200, {guid:guid.generate(req.query.useDashes)});
});

router.get('/api/beer/striketemp', function(req, res) {
    res.json(200, strikeTemp.calc(req.query.quarts, req.query.lbs, req.query.t1, req.query.t2));
});

router.get('/api/beer', function(req, res) {
    res.json(200, { Message: 'Drink Beer' });
});

router.get('/api/data', function(req, res) {
    var key = req.query.key;
    var id = req.query.id;
    
    
    if(database[key] === undefined){
        res.json(404, { Message: "No datasource named [" + key + "] was found.  Start it now!"});    
    }
    else{
        if(id === undefined){
            res.json(200, database[key]);
        }
        else{
            var item = database[key][id];
            
            if(item !== undefined){
                res.json(200, item);
            }
            else{
                res.json(404, { Message: "No item with id ["+id+"] found in datasource with key [" + key + "]."});
            }
        }
    }
});

router.post('/api/data', function(req, res) {
    var key = req.query.key;
    if(database[key] === undefined){
        database[key] = {};
    }
    var newGuid = guid.generate(true);
    
    database[key][newGuid] = JSON.parse(req.body.bodyvalue);
    
    res.json(200, { id: newGuid });
    
});

router.delete('/api/data', function(req, res) {
    var key = req.query.key;
    var id = req.query.id;
    
    if(key === undefined){
        res.json(404, { Message: "No key parameter was specified."});
    }
    else if(id === undefined){
        res.json(404, { Message: "No id parameter was specified."});
    }
    else{
    
        if(database[key] === undefined){
            res.json(404, { Message: "No datasource named [" + key + "] was found.  Start it now."});    
        }
        else{
            
            if(database[key][id] !== undefined){
                delete database[key][id];
                res.json(200, { deleted: true });
            }
            else{
                res.json(404, { Message: "No item with id ["+id+"] found in datasource with key [" + key + "]."});
            }
        }
    }
});


router.get('/api/db', function(req, res) {
    mySqlConnection.query('SHOW DATABASES', function(err, rows) {
      if (err)
        throw err;
      res.json(200, { rows: rows });
    });
    
});

router.get('/api/db2', function(req, res) {
    mySqlConnection.query(req.query.sql, function(err, rows) {
      if (err)
        throw err;
      res.json(200, { rows: rows });
    });
    
});

router.get('/api/persons', function(req, res) {
    mySqlConnection.query(req.query.sql, function(err, rows) {
      if (err)
        throw err;
      res.json(200, { rows: rows });
    });
    
});


router.get('/api/addperson', function(req, res) {
    if(mySqlConnection != null){
        var query = mySqlConnection.query('INSERT INTO Persons SET ?', {
          "PersonID": "2",
          "LastName": "Ruffino2",
          "FirstName": "Tony2",
          "Address": null,
          "City": null
        }, function(err, result) {
            if (err)
                throw err; 
            res.send(result);
        });
    }else{
        res.send('mySqlConnection not initialized!');
    }
});

router.get('/api/yup', function(req, res) {
  res.send({uh:'huh'});
});





/////////////
//Universe
/////////////
router.get('/mapplied/getUniverse', function(req, res) {
    res.json(200, mapplied.getUniverse());
});

router.get('/mapplied/getQuadrant', function(req, res) {
    res.json(200, mapplied.getQuadrant(req.query));
});

router.get('/mapplied/setHorizontalLinearMultiplier', function(req, res) {
    res.json(200, mapplied.setHorizontalLinearMultiplier(req.query.val));
});









//////////////////////////
//END CONTROLLER ROUTES///
//////////////////////////



//////////////////////////
//START UP SERVER(S)//////
//////////////////////////

//HTTPS
if(secureServer != null){
    try{
        secureServer.listen(process.env.SECURE_PORT || 443, process.env.SECURE_IP || "0.0.0.0", function(){
            var addr = secureServer.address();
            console.log("Secure server listening at", addr.address + ":" + addr.port);
        });
    }
    catch(err2){
        console.log("Err: " + err2);
        secureServerErr = "Err: " + err2;
    }
}


if(server === undefined || server === null){
    server = http.createServer(router);
}

//HTTP
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
    var addr = server.address();
    console.log("Forked HTTP server listening at", addr.address + ":" + addr.port);
});