var publicdir = __dirname + '/client';

var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

var fs = require('fs');
var mkpath = require('mkpath');
var moment = require('moment-timezone');


//////////////////////
//BEGIN HTTPS CONFIG
//////////////////////
var https = null;
var useHttps = false;

if(process.env.SECURE_PORT !== undefined && process.env.SECURE_PORT !== null){
    console.log('useHttps was set to true.');
    useHttps = true;
    https = require('https');
}else{
    console.log('useHttps was not set to true.');
}
//////////////////////
//END HTTPS CONFIG
//////////////////////

//////////////////////
//BEGIN MYSQL CONFIG
//////////////////////
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
//////////////////////
//END MYSQL CONFIG
//////////////////////

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
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
if(path === undefined || path === null){
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



//////////////////////////
//BEGIN SOCKET IO SETUP///
//////////////////////////
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





server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
