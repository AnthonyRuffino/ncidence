console.log('############# WELCOME TO NCIDENCE................................');
console.log('############# WELCOME TO NCIDENCE................................');
console.log('############# WELCOME TO NCIDENCE................................');

var DEFAULT_HOST = 'ncidence_com';
var publicdir = __dirname + '/client';

var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

var fs = require('fs');
var mkpath = require('mkpath');
var moment = require('moment-timezone');

var mysqlClient = require('mysql');


//////////////////////
//BEGIN HTTPS CONFIG
//////////////////////
var https = null;
var useHttps = false;

if(process.env.SECURE_PORT !== undefined && process.env.SECURE_PORT !== null){
    console.log('Using SSL.');
    useHttps = true;
    https = require('https');
}else{
    console.log('Not using SSL.');
}
//////////////////////
//END HTTPS CONFIG
//////////////////////

//////////////////////
//BEGIN MYSQL CONFIG
//////////////////////
var mySqlIp = process.env.MYSQL_PORT_3306_TCP_ADDR || 'localhost';
var mySqlConnection = null;
var defaultHost = process.env.DEFAULT_HOST || DEFAULT_HOST;


var createConnection = function(database){
  console.log('############# BEGIN create connection - ' + database + ';');
  var mySqlConnectionLocal = mysqlClient.createConnection({
    host: mySqlIp,
    user: process.env.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root',
    password: process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD || null,
    database : database
  });
  return mySqlConnectionLocal;
}


if(mySqlIp !== null && mySqlIp !== undefined){
  console.log('LOADING mysql. ');
    try {
         mySqlConnection = createConnection('mysql');
         console.log('mysql LOADED. ');
    }catch (e) {
        console.log('FAILED TO LOAD mysql. ');
        console.log(e)
    }
}else{
  console.log('mysql NOT LOADED. ');
}




var createDatabase = function(database) {
  console.log('############# BEGIN show databases like ' + database + ';');
  mySqlConnection.query('SHOW DATABASES LIKE \''+database+'\'', function(err, rows) {
    var hasResults = rows !== undefined && rows !== null && !rows.length !== null && !rows.length !== undefined  && !rows.length < 1;
    if (err){
      console.log('!!!!!!!!!!!!! ERROR show databases like ' + database + '; --> ERROR: '+ err);
    }else{
      console.log('############# END show databases like ' + database + ';' + ' --> ['+(hasResults ? rows.length : 0)+' results]');
    }
    if(hasResults === false){
      console.log('############# BEGIN create schema ' + database);
      mySqlConnection.query('CREATE SCHEMA '+database, function(err, rows) {
        if (err){
          console.log('!!!!!!!!!!!!! END create schema ' + database + '; --> ERROR: '+ err);
        }else{
          console.log('############# END create schema - ' + database + '; --> ' + rows);
        }
      });
    }
    console.log('############# SWITCHING DATABASE: ' + database);
    mySqlConnection = createConnection(database);
    console.log('############# DONE SWITCHING DATABASE: ' + database);
  });
};



if(mySqlConnection !== null){
  console.log('############# CHECKING DATABASE: ' + DEFAULT_HOST);
  try{
    createDatabase(DEFAULT_HOST);
  }catch(err){
    console.log('############# ERROR CHECKING DATABASE: ' + err);
  }
  
  console.log('############# DONE CHECKING DATABASE: ' + DEFAULT_HOST);
}else{
  console.log('!!!!!!!!!!!!! mySqlConnection is null');
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
//BEGIN MIDDLEWARE///
//////////////////////////
console.log('############# MIDDLEWARE');
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
//////////////////////////
//END MIDDLEWARE///
//////////////////////////



//////////////////////////
//BEGIN SOCKET IO SETUP///
//////////////////////////
console.log('############# SOCKET IO');
var io = null;
var messages = [];
var sockets = [];

if(useHttps === true && secureServer != null){
    io = socketio.listen(secureServer);
}
else{
    if(server === undefined || server === null){
        server = http.createServer(router);
    }
    io = socketio.listen(server);
}

io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}
//////////////////////////
//END SOCKET IO SETUP///
//////////////////////////

console.log('############# /api/db');
router.get('/api/db', function(req, res) {
    if(req.query.psw !== undefined && req.query.psw !== null && req.query.psw === process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD){
      console.log('######################/api/db');
      
      if(req.query.sql !== undefined && req.query.sql !== null && req.query.sql.length > 0){
        
        try{
          mySqlConnection.query(req.query.sql, function(err, result) {
            if (err){
                var errResponse = { err: err };
                errResponse.sql=req.query.psw;
                res.json(200, errResponse);
            }else{
                var resultResponse = { result: result };
                resultResponse.sql=req.query.psw;
                res.json(200, resultResponse);
            }
          });
        }catch(ex){
          var exResponse = { ex: ex };
          exResponse.sql=req.query.psw;
          res.json(200, exResponse);
        }
      }else{
        res.json(200, { err: '"sql" paremeter was not provided' });
      }
      
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
        createDatabase(DEFAULT_HOST); 
    }catch(ex){
        res.json(200, { err: 'mysql connection error: ' + ex });
    }
});






server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  console.log('trying to listen...');
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
