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

var DEFAULT_HOST = process.env.DEFAULT_HOST || 'test';
global.__base = __dirname + '/';
var publicdir = __dirname + '/client';

var http = require('http');
var path = require('path');

var async = require('async');

var express = require('express');

var fs = require('fs');
var mkpath = require('mkpath');
var moment = require('moment-timezone');

var guid = require('./utils/guid.js');
var bcrypt = require('bcrypt-nodejs');



var QUERY_ROWS_LIMIT = 10000;
var CAPTCHA_EXP_IN_MINUTES = 5;





//////////////////////
//BEGIN MYSQL CONFIG
//////////////////////
var mySqlHelper = new(require('./utils/mySqlHelper.js')).MySqlHelper();
var ormHelper = null;
var mySqlIp = process.env.MYSQL_PORT_3306_TCP_ADDR || 'localhost';
var mySqlUser = process.env.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root';
var mySqlPassword = process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD || 'c9mariadb';



//START To Default Host Database.  Connect to 'mysql' schema first
if (mySqlIp !== null && mySqlIp !== undefined) {
  mySqlHelper.init(mySqlIp, mySqlUser, mySqlPassword, 'mysql');
  ormHelper = new(require('./utils/ormHelper.js')).OrmHelper(mySqlIp, mySqlUser, mySqlPassword, DEFAULT_HOST, mySqlHelper);
  console.log('LOADING mysql. ');
  mySqlHelper.createDatabase(DEFAULT_HOST, function() {
    ormHelper.sync();
  });


}
else {
  console.log('mysql NOT LOADED. ');
}



var userService = new(require('./utils/orm/services/userService.js')).UserService(ormHelper);
//////////////////////
//END MYSQL CONFIG
//////////////////////

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
console.log('Configure Router');
var router = express();
router.use(express.bodyParser());
var server = http.createServer(router);
var secureServer = null;



//////////////////////
//BEGIN HTTPS CONFIG
//////////////////////
var useHttps = false;
var secureServerErr = null;

if (process.env.SECURE_PORT !== undefined && process.env.SECURE_PORT !== null) {
  console.log('Using SSL.');
  var sslHelper = new(require('./utils/sslHelper.js')).SSLHelper(fs);
  try {
    secureServer = sslHelper.configure(router);
  }
  catch (err) {
    secureServer = null;
    secureServerErr = "Err1: " + err;
    console.log('Error creating https server: ' + err);
  }
  useHttps = secureServer !== null;
}
else {
  console.log('Not using SSL.');
}
//////////////////////
//END HTTPS CONFIG
//////////////////////







//////////////////////////
//BEGIN MIDDLEWARE///
//////////////////////////
console.log('Enable Middleware');
if (useHttps === true) {
  router.use(function requireHTTPS(req, res, next) {
    if (!req.secure) {
      return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
  });
}

var fauxIndexHtmlObj = new(require('./utils/middleware/fauxIndexHtml.js')).FauxIndexHtml(publicdir);
router.use(function(req, res, next) {
  fauxIndexHtmlObj.process(req, res, next)
});

router.use(express.static(publicdir));
//////////////////////////
//END MIDDLEWARE///
//////////////////////////



//////////////////////////
//BEGIN SOCKET IO SETUP///
//////////////////////////
console.log('Socket IO');
var socketIOHelper = new(require('./utils/socketIOHelper.js')).SocketIOHelper(secureServer !== null ? secureServer : server);
socketIOHelper.init();
//////////////////////////
//END SOCKET IO SETUP///
//////////////////////////

console.log('Define /api/db');
router.get('/api/db', function(req, res) {
  if (req.query.psw !== undefined && req.query.psw !== null && req.query.psw === process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD) {

    mySqlHelper.query(req.query.sql, function(err, results) {
      if (err) {
        res.json(200, err);
      }
      else {
        res.json(200, results);
      }
    });
  }
  else {
    if (req.query.psw !== undefined && req.query.psw !== null) {
      res.json(200, {
        err: 'try again'
      });
    }
    else {
      res.json(200, {
        err: 'not authorized'
      });
    }
  }
});


console.log('Define /api/init-db');
router.get('/api/init-db', function(req, res) {
  try {
    mySqlHelper.createDatabase(DEFAULT_HOST);
  }
  catch (ex) {
    res.json(200, {
      err: 'mysql connection error: ' + ex
    });
  }
});

router.get('/api/guid', function(req, res) {
  res.json(200, {
    guid: guid.generate(req.query.useDashes)
  });
});

router.get('/api/schemaSizeInMb', function(req, res) {
  mySqlHelper.getSchemaSizeInMb(req.query.schema, function(err, results){
    if(err){
      res.json(200, {
        err: err
      });
    }else{
      res.json(200, {
        sizeInMb: results
      });
    }
  });
  
});

router.get('/api/roles', function(req, res) {

  var query = {};
  var options = {};
  var limit = null;
  var order = [];
  var isIdSearch = false;

  var role = ormHelper.getMap()['role'];
  var entity = role.entity;
  var definition = entity.definition;
  var model = role.model;

  Object.keys(req.query).forEach(function(key) {
    if (key === '_limit') {
      limit = Number(req.query[key]);
    }
    else if (key === '_asc') {
      if (definition.hasOwnProperty(req.query[key])) {
        order = req.query[key];
      }
    }
    else if (key === '_desc') {
      if (definition.hasOwnProperty(req.query[key])) {
        order.push(req.query[key]);
        order.push("Z");
      }
    }
    else if (key === '_offset') {
      var offset = Number(req.query[key]);
      if (offset != null && !isNaN(offset))
        options.offset = offset;
    }
    else if (definition.hasOwnProperty(key)) {
      if (key === 'id')
        isIdSearch = true;
      query[key] = req.query[key];
    }
    else if (key.startsWith("__") && key.length > 2 && key !== '__proto__') {
      /*
      var fieldName = key.substr(2);
      
      if (entity.hasOne !== undefined && entity.hasOne !== null && entity.hasOne.length > 0) {
				entity.hasOne.forEach(function(owner) {
					
				});
			}
			*/
    }
  });

  if (limit === null || isNaN(limit) || limit > QUERY_ROWS_LIMIT) {
    limit = QUERY_ROWS_LIMIT;
  }

  model.find(query, options, limit, order,
    function(err, rows) {
      if (err) {
        res.json(500, {
          err: err
        });
      }
      else if (rows !== undefined && rows !== undefined && rows.length > 0) {
        if (isIdSearch) {
          rows[0].getUsers(function(err, users) {
            rows[0].users = users;
            var resObj = {
              data: rows
            };
            if (err) resObj.errorGettingUsers = err;
            res.json(200, resObj);
          });
        }
        else {
          res.json(200, {
            data: rows
          });
        }


      }
      else {
        res.json(200, {
          data: []
        });
      }
    });
});


router.get('/u/:name/:file', function(req,res){
  var name = req.params.name;
  var file = req.params.file;
  
  res.cookie('httponly', 'val1', { maxAge: 900000, httpOnly: true });
  res.cookie('browsable', 'val2', { maxAge: 900000, httpOnly: false });
  
  ormHelper.getMap()['user'].model.find({email:name}, function(err, users){
    var content = null;
    if(err || users === undefined || users == null || users.length < 1 || users[0] === undefined || users[0] === null){
      res.writeHead(200, {
          'Content-Type': 'text/html'
      });
      res.end('<h1>Error finding content for user: '+name+'</h1><br/><h2>Err:'+(err || 'no such user')+'</h2>');
    }else{
      ormHelper.getMap()['file'].model.find({user_id: users[0].id, name: file}, function(err, files){
        if(err || files === undefined || files == null || files.length < 1 || files[0] === undefined || files[0] === null){
          res.writeHead(200, {
              'Content-Type': 'text/html'
          });
          res.end('<h1>Error finding file for user: '+name+'. ile: '+file+'</h1><br/><h2>Err :'+(err || 'no such file')+'</h2>');
        }else{
          res.writeHead(200, {
              'Content-Type': files[0].content_type
          });
          res.end(files[0].content);
        }
      });
    }
  });
  
});


router.get('/api/login', function(req,res){
  userService.createUser(req,res);
});

router.get('/api/addUser', function(req, res) {
  userService.createUser(req,res);
});


var captchapng = require('captchapng');
router.get('/api/captcha', function(req, res) {
  
  var number = parseInt(Math.random()*900000+100000);
  var captchaId = guid.generate(true, 4);
  var expDate = new Date((new Date()).getTime() + CAPTCHA_EXP_IN_MINUTES*60000);
  
  var captchaModel = ormHelper.getMap()['captcha'].model;
  
  captchaModel.create({guid:captchaId, answer: number+'', expiration_date: expDate}, function(err){
    if(err){
      res.json(500, {
        err: 'Error creating CAPTCHA: ' + err
      });
    }else{
      var p = new captchapng(80,30,number); // width,height,numeric captcha 
      p.color(0, 0, 0, 0);  // First color: background (red, green, blue, alpha) 
      p.color(80, 80, 80, 255); // Second color: paint (red, green, blue, alpha)
      
      var img = p.getBase64();
      var imgbase64 = new Buffer(img,'base64');
      res.writeHead(200, {
          'Content-Type': 'image/png',
          'captcha-id': captchaId
      });
      res.end(imgbase64);
    }
    
  });
  
});




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


server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
  console.log('trying to listen...');
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
