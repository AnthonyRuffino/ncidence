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
var express = require('express');

var fs = require('fs');




var guid = require('./utils/guid.js');



var QUERY_ROWS_LIMIT = 10000;
var CAPTCHA_EXP_IN_MINUTES = 5;


var SESSION_EXP_SEC = process.env.SESSION_EXP_SEC || (60 * 60 * 24 * 7);
var JWT_SECRET = process.env.JWT_SECRET || 'jehfiuqwhfuhf23yr8923rijfowijfp';
var JWT_TOKEN_KEY = 'jwt-token';



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
  
  const entities = [];
	entities.push((require('./utils/orm/entities/role.js')).Entity);
	entities.push((require('./utils/orm/entities/user.js')).Entity);
	entities.push((require('./utils/orm/entities/file.js')).Entity);
	entities.push((require('./utils/orm/entities/token.js')).Entity);
	entities.push((require('./utils/orm/entities/captcha.js')).Entity);
	
  ormHelper = new(require('./utils/ormHelper.js')).OrmHelper({
    ip: mySqlIp, 
    user: mySqlUser, 
    password: mySqlPassword, 
    database: DEFAULT_HOST, 
    mySqlHelper,
    entities
  });
  
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
var server = http.createServer(router);
var secureServer = null;




//COOKIE PARSER
var cookieParser = require('cookie-parser');
router.use(cookieParser());

//BODY PARSER
var bodyParser   = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
router.use(bodyParser.json());




//PASSPORT - JWT
var passport = require('passport');
var jwt = require('jsonwebtoken');
var passportJWT = require("passport-jwt");
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

var jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
jwtOptions.secretOrKey = JWT_SECRET;
jwtOptions.expiresIn = SESSION_EXP_SEC;
jwtOptions.passReqToCallback = true;


const COOKIE_EXP_SEC = (SESSION_EXP_SEC * 1000) * 10;
const setJwtCookie = (res, token) => {
  res.cookie(JWT_TOKEN_KEY, token, { maxAge: COOKIE_EXP_SEC, httpOnly: true });
}

const clearJwtCookie = (res) => {
  res.clearCookie(JWT_TOKEN_KEY);
}

var getTokenFromCookies = (cookies) => {
  return cookies[JWT_TOKEN_KEY];
}

var verifyToken = (token) => {
  try{
      return jwt.verify(token, JWT_SECRET);
    } catch(err) {
      console.log('JWT verify exception: ' + err.message);
    }
} 


var jwtHeaderFromCookie = function requireHTTPS(req, res, next) {
  var token = getTokenFromCookies(req.cookies);
  if(token !== undefined && token !== null) {
    let payload = verifyToken(token);
    if(payload) {
      const newToken = jwt.sign({ id: payload.id, username: payload.username }, jwtOptions.secretOrKey, {expiresIn: jwtOptions.expiresIn});
      setJwtCookie(res, newToken);
      req.headers['authorization'] = 'JWT ' + newToken;
    } else {
      clearJwtCookie(res);
    }
  }
  next();
};
router.use(jwtHeaderFromCookie);
router.use(passport.initialize());


var strategy = new JwtStrategy(jwtOptions, function(req, jwt_payload, next) {
  userService.getUserById(jwt_payload.id, (user) => {
    if (user) {
      next(null, user);
    } else {
      next(null, false);
    }
  });
});
passport.use(strategy);







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
var socketIOHelper = new(require('./utils/socketIOHelper.js')).SocketIOHelper(secureServer !== null ? secureServer : server, {getTokenFromCookies, verifyToken});
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
  mySqlHelper.getSchemaSizeInMb(req.query.schema, function(err, results) {
    if (err) {
      res.json(200, {
        err: err
      });
    }
    else {
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


router.get('/u/:name/:file', function(req, res) {
  var name = req.params.name;
  var file = req.params.file;

  res.cookie('httponly', 'val1', { maxAge: 900000, httpOnly: true });
  res.cookie('browsable', 'val2', { maxAge: 900000, httpOnly: false });

  ormHelper.getMap()['user'].model.find({ email: name }, function(err, users) {
    var content = null;
    if (err || users === undefined || users == null || users.length < 1 || users[0] === undefined || users[0] === null) {
      
      console.log('test param: ', req.query.ex !== undefined);
          if(req.query.ex !== undefined) {
            var code = '((ctx) => { console.log("testValue: ", ctx.testValue); ctx.res.writeHead(200, {"Content-Type": "text/html"}); ctx.res.end("<h1>LOLZ - "+ctx.testValue+"</h1>"); })(ctx);';
            var your_code = new Function(['ctx'].join(','), code);
            
            try{
              your_code({req, res, testValue: 'trster'});
            } catch(executionException) {
              res.writeHead(200, {
                'Content-Type': 'text/html'
              });
              res.end('<h1>Error executing lambda expression: ' + executionException + '</h2>');
            }
            
          } else {
            res.writeHead(200, {
              'Content-Type': 'text/html'
            });
            res.end('<h1>Error finding content for user: ' + name + '</h1><br/><h2>Err:' + (err || 'no such user') + '</h2>');
          }
      
    }
    else {
      ormHelper.getMap()['file'].model.find({ user_id: users[0].id, name: file }, function(err, files) {
        if (err || files === undefined || files == null || files.length < 1 || files[0] === undefined || files[0] === null) {
          res.writeHead(200, {
            'Content-Type': 'text/html'
          });
          res.end('<h1>Error finding file for user: ' + name + '. ile: ' + file + '</h1><br/><h2>Err :' + (err || 'no such file') + '</h2>');
        }
        else {
          if(files[0].content_type === 'lambda') {
            var code = '((req, res) => { ' + files[0].content + ' })(req, res);';
            var your_code = new Function(['req', 'res'].join(','), code);
            your_code(req, res);
          } else {
            res.writeHead(200, {
              'Content-Type': files[0].content_type
            });
            res.end(files[0].content);
          }
        }
      });
    }
  });

});





router.get('/api/promise', async function(req, res) {

  var delay = req.query.delay || 500;

  var prom = function(inVal) {
    return new Promise(function(resolve, reject) {
      setTimeout(function(){
        if(req.query.error){
          reject(req.query.error);
        }else{
          resolve(inVal);
        }
      }, parseInt(delay));
    });
  }

  try {
    var promiseData = await prom(req.query.text || 'example');

    res.json(200, {
      val: promiseData,
      delay: delay
    });
  }
  catch (error) {
    res.json(400, {
      error: error,
      delay: delay
    });
  }
});


var captchapng = require('captchapng');
router.get('/api/captcha', function(req, res) {

  var number = parseInt(Math.random() * 900000 + 100000);
  var captchaId = guid.generate(true, 4);
  var expDate = new Date((new Date()).getTime() + CAPTCHA_EXP_IN_MINUTES * 60000);

  var captchaModel = ormHelper.getMap()['captcha'].model;

  captchaModel.create({ guid: captchaId, answer: number + '', expiration_date: expDate }, function(err) {
    if (err) {
      res.json(500, {
        err: 'Error creating CAPTCHA: ' + err
      });
    }
    else {
      var p = new captchapng(80, 30, number); // width,height,numeric captcha 
      p.color(0, 0, 0, 0); // First color: background (red, green, blue, alpha) 
      p.color(80, 80, 80, 255); // Second color: paint (red, green, blue, alpha)

      var img = p.getBase64();
      var imgbase64 = new Buffer(img, 'base64');
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'captcha-id': captchaId
      });
      res.end(imgbase64);
    }

  });

});

 var fileService = new(require('./utils/orm/services/fileService.js')).FileService(ormHelper);
 
 var formidable = require('formidable')
router.post('/fileupload', function(req, res) {
  var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      var filePath = files.filetoupload.path;
      console.log('filePath: ', filePath, files.filetoupload.name);
      
      //var text = fs.readFileSync(files.filetoupload.path,'utf8')
      //fileService


      fs.readFile(files.filetoupload.path, function (err, data) {
        if(err) {
          console.log('err loading file: ', err);
          res.redirect('/');
          return;
        }
        fileService.createFile({ name: files.filetoupload.name, content: data, content_type: 'text/html' }, function(err) {
          if(err) {
            console.log('err persisting file: ', err);
          } else {
            console.log('file persisted');
          }
          res.redirect('/');
        });
        
      });
 });
});














router.get('/api/login', function(req, res) {
  userService.login(req, res);
});

router.get('/api/addUser', function(req, res) {
  userService.createUser(req, res);
});


router.get("/logout", function(req, res) {
  
  var token = getTokenFromCookies(req.cookies);
  var user = verifyToken(token);
  
  if(user) {
    //socketIOHelper.logoutUser(user.username);
    socketIOHelper.logoutUser(req.cookies.io);
  }
  
  clearJwtCookie(res);
  res.redirect('/');
});

router.post("/auth", urlencodedParser, function(req, res) {
  userService.login2(req.body.username, req.body.password, function (err, user) {
    if (err) {
      res.status(401).json({message:"passwords did not match"});
      return;
    }
    if (!user) {
      res.status(401).json({message:"passwords did not match"});
      return;
    }
    
    var token = jwt.sign(user, jwtOptions.secretOrKey, {expiresIn: jwtOptions.expiresIn});
    socketIOHelper.loginUser(req.cookies.io, user, token);
    setJwtCookie(res, token);
    res.redirect('/');
  });
});


router.get("/secret", passport.authenticate('jwt', { session: false }), function(req, res){
  res.json({message: "Success!", user: req.user});
});









//////////////////////////
//START UP SERVER(S)//////
//////////////////////////

//HTTPS
if (secureServer != null) {
  try {
    secureServer.listen(process.env.SECURE_PORT || 443, process.env.SECURE_IP || "0.0.0.0", function() {
      var addr = secureServer.address();
      console.log("Secure server listening at", addr.address + ":" + addr.port);
    });
  }
  catch (err2) {
    console.log("Err: " + err2);
    secureServerErr = "Err: " + err2;
  }
}


if (server === undefined || server === null) {
  server = http.createServer(router);
}


server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
  console.log('trying to listen...');
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
