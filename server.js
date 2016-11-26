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

var guid = require('./utils/guid.js');




//////////////////////
//BEGIN MYSQL CONFIG
//////////////////////

var mySqlIp = process.env.MYSQL_PORT_3306_TCP_ADDR || 'localhost';
var mySqlConnection = null;
var defaultHost = process.env.DEFAULT_HOST || DEFAULT_HOST;


var createConnection = function(database, callback){
  console.log('############# BEGIN create connection - ' + database + ';');
  var mysqlClientTemp = require('mysql');
  var mySqlConnectionLocal = null;
  
  try{
    mySqlConnectionLocal = mysqlClientTemp.createConnection({
      host: mySqlIp,
      user: process.env.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root',
      password: process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD || null,
      database : database
    });
    console.log('############# END create connection - ' + database + ';');
  }catch(ex){
    console.log('############# EXCEPTION create connection - ' + database + '; Error: ' + ex);
  }
  
  if(callback !== undefined && callback !== null){
    callback(mySqlConnectionLocal, database);
  }else{
	  return mySqlConnectionLocal;
  }
  
}


var switchToDefaultHostDatabase = function(database) {
  console.log('############# SWITCHING DATABASE: ' + database);
  mySqlConnection = createConnection(database, null);
  console.log('############# DONE SWITCHING DATABASE: ' + database);
}



var createDatabase = function(connection, database, callback) {
  console.log('############# BEGIN show databases like ' + database + ';');
  connection.query('SHOW DATABASES LIKE \''+database+'\'', function(err, rows) {
    var hasResults = rows !== undefined && rows !== null && !rows.length !== null && !rows.length !== undefined  && !rows.length < 1;
    if (err){
      console.log('!!!!!!!!!!!!! ERROR show databases like ' + database + '; --> ERROR: '+ err);
    }else{
      console.log('############# END show databases like ' + database + ';' + ' --> ['+(hasResults ? rows.length : 0)+' results]');
    }
    if(hasResults === false){
      console.log('############# BEGIN create schema ' + database);
      connection.query('CREATE SCHEMA '+database, function(err, rows) {
        if (err){
          console.log('!!!!!!!!!!!!! ERROR create schema ' + database + '; --> ERROR: '+ err);
        }else{
          console.log('############# END create schema - ' + database + '; --> ' + rows);
          if(callback !== undefined && callback !== null){
            callback(database);
          }
        }
      });
    }else{
      if(callback !== undefined && callback !== null){
        callback(database);
      }
    }
  });
};


var checkForDefaultHostDatabase = function(sqlConnection, database){
  if(sqlConnection !== null){
    console.log('############# CHECKING DATABASE: ' + defaultHost);
    try{
      createDatabase(sqlConnection, defaultHost, switchToDefaultHostDatabase);
    }catch(err){
      console.log('############# ERROR CHECKING DATABASE: ' + err);
    }
  }else{
    console.log('!!!!!!!!!!!!! sqlConnection is null');
  }
}







//START To Default Host Database.  COnnect to 'mysql' schema first
if(mySqlIp !== null && mySqlIp !== undefined){
  console.log('LOADING mysql. ');
    try {
         createConnection('mysql', checkForDefaultHostDatabase);
         console.log('mysql LOADED. ');
    }catch (e) {
        console.log('FAILED TO LOAD mysql. ');
        console.log(e)
    }
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

var fauxIndexHtmlObj = new (require('./utils/middleware/fauxIndexHtml.js')).FauxIndexHtml(publicdir, fs);
router.use(function(req, res, next) {fauxIndexHtmlObj.process(req,res,next)});

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
                errResponse.sql=req.query.sql;
                res.json(200, errResponse);
            }else{
                var resultResponse = { result: result };
                resultResponse.sql=req.query.sql;
                res.json(200, resultResponse);
            }
          });
        }catch(ex){
          var exResponse = { ex: ex };
          exResponse.sql=req.query.sql;
          exResponse.mySqlConnectionIsNull=mySqlConnection === undefined || mySqlConnection === null;
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

router.get('/api/guid', function(req, res) {
    res.json(200, {guid:guid.generate(req.query.useDashes)});
});






server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  console.log('trying to listen...');
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
