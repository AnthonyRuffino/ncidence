console.log('..........................................................');
console.log('..........................................................');
console.log('..........................................................');
console.log('....................@Launching Ncidence@..................');
console.log('..........................................................');
console.log('..........................................................');
console.log('..........................................................');


const tools = {};


var DEFAULT_SCHEMA = process.env.DEFAULT_SCHEMA || 'ncidence__aruffino_c9users_io';
global.__base = __dirname + '/';
var publicdir = __dirname + '/client';

var http = require('http');
var express = require('express');

var fs = require('fs');

var guid = require('./utils/guid.js');




var SESSION_EXP_SEC = process.env.SESSION_EXP_SEC || (60 * 60 * 24 * 7);
var JWT_SECRET = process.env.JWT_SECRET || 'jehfiuqwhfuhf23yr8923rijfowijfp';

var QUERY_ROWS_LIMIT = 10000;
var CAPTCHA_EXP_IN_MINUTES = 5;


//////////////////////
//BEGIN MYSQL CONFIG
//////////////////////
var yourSql = new(require('./utils/yourSql.js')).YourSql();
var ormHelper = null;
var mySqlIp = process.env.MYSQL_PORT_3306_TCP_ADDR || 'localhost';
var mySqlUser = process.env.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root';
var mySqlPassword = process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD || 'c9mariadb';



//START To Default Host Database.  Connect to 'mysql' schema first
if (mySqlIp !== null && mySqlIp !== undefined) {
  yourSql.init({
    host: mySqlIp,
    user: mySqlUser,
    password: mySqlPassword,
    database: 'mysql',
    connectionLimit: 100,
    debug: true
  });

  const entities = [];
  entities.push((require('./utils/orm/entities/role.js')).Entity);
  entities.push((require('./utils/orm/entities/user.js')).Entity);
  entities.push((require('./utils/orm/entities/file.js')).Entity);
  entities.push((require('./utils/orm/entities/token.js')).Entity);
  entities.push((require('./utils/orm/entities/captcha.js')).Entity);
  entities.push((require('./utils/orm/entities/game.js')).Entity);

  const getOrmHelperInstance = ({
    ip,
    user,
    password,
    database,
    mySqlHelper,
    localEntities,
    doSync
  }) => {
    return new(require('./utils/ormHelper.js')).OrmHelper({
      ip: ip || mySqlIp,
      user: user || mySqlUser,
      password: password || mySqlPassword,
      database,
      yourSql: mySqlHelper,
      entities: localEntities,
      loadDefaultData: doSync
    });
  }

  ormHelper = getOrmHelperInstance({
    database: DEFAULT_SCHEMA,
    mySqlHelper: yourSql,
    localEntities: entities,
    doSync: process.env.LOAD_DEFAULT_DATA || true
  });
  ormHelper.getOrmHelperInstance = getOrmHelperInstance;

  console.log('LOADING mysql. ');
  yourSql.createDatabase(DEFAULT_SCHEMA).then(() => {
    ormHelper.sync();
  }).catch((err) => {
    console.log(err);
    ormHelper.sync();
  });

}
else {
  console.log('mysql NOT LOADED.');
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
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
router.use(bodyParser.json());


const ONE_YEAR_IN_MS = 1000 * 60 * 60 * 24 * 365;
var setSiteCookie = (req, res, next) => {
  let cookieValue = req.cookies['ncidence'];
  if (cookieValue === undefined || cookieValue === null) {
    cookieValue = guid.generate(true);
  }

  res.cookie('ncidence', cookieValue, { maxAge: ONE_YEAR_IN_MS, httpOnly: true, domain: '.' + tools.DEFAULT_HOST });
  next();
};
router.use(setSiteCookie);





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


String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};

tools.DEFAULT_HOST = DEFAULT_SCHEMA.replaceAll('__', '-').replaceAll('_', '.');
tools.getSubdomain = (host) => {
  let subdomain;
  if (tools.DEFAULT_HOST !== host && host.endsWith("." + tools.DEFAULT_HOST)) {
    subdomain = host.substring(0, host.indexOf("." + tools.DEFAULT_HOST));
  }
  return subdomain;
}


tools.getGame = (subdomain) => {
  return new Promise((resolve, reject) => {
    ormHelper.getMap()['game'].model.find({ name: subdomain }, (err, games) => {
      if (err) {
        reject(err);
        return;
      }
      if (!games[0]) {
        resolve({})
        return;
      };
      games[0].getDefinition((err, data) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ game: games[0], definition: data });
      });
    });
  });
}


router.use('/', async(req, res, next) => {
  const subdomain = tools.getSubdomain(req.get('host'));
  if (req.url === '/driver' && subdomain !== undefined) {
    var game = await tools.getGame(subdomain);

    res.writeHead(200, {
      'Content-Type': 'application/javascript'
    });

    if (game !== undefined && game.game !== undefined && game.definition.driver !== undefined) {
      res.end(game.definition.driver);
    }
    else {
      res.end('window.location.replace("/");');
    }

  }
  else {
    next();
  }

});

//////////////////////////
//BEGIN MIDDLEWARE///
//////////////////////////
console.log('Enable Middleware');
if (useHttps === true) {
  router.use('redirect-secure');
}

router.use(require('no-extension')(publicdir));
router.use(express.static(publicdir));
//////////////////////////
//END MIDDLEWARE///
//////////////////////////



///////////////////////////////////////////
//BEGIN SOCKET IO SETUP & JWT AUTH SETUP///
////////////////////////////////////////////
console.log('---Socket IO');
var jwtCookiePasser = new(require('jwt-cookie-passer')).JwtCookiePasser({
  domain: tools.DEFAULT_HOST,
  secretOrKey: JWT_SECRET,
  expiresIn: SESSION_EXP_SEC,
  useJsonOnLogin: false,
  useJsonOnLogout: false
});
var socketIOHelper = new(require('./utils/socketIOHelper.js')).SocketIOHelper(secureServer !== null ? secureServer : server, jwtCookiePasser, tools);
socketIOHelper.init();

console.log('---JWT');
jwtCookiePasser.init({
  router,
  urlencodedParser,
  userService,
  loginLogoutHooks: socketIOHelper
});
/////////////////////////////////////////
//END SOCKET IO SETUP & JWT AUTH SETUP///
/////////////////////////////////////////





console.log('Define /api/db');
router.get('/api/db', function(req, res) {
  if (req.query.psw !== undefined && req.query.psw !== null && req.query.psw === process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD) {

    yourSql.query(req.query.sql, function(err, results) {
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
    yourSql.createDatabase(DEFAULT_SCHEMA).then(() => {}).catch((err) => {
      console.log(err);
    });
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
  yourSql.getSchemaSizeInMb(req.query.schema, function(err, results) {
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

  ormHelper.getMap()['user'].model.find({ email: name }, function(err, users) {
    var content = null;
    if (err || users === undefined || users == null || users.length < 1 || users[0] === undefined || users[0] === null) {

      console.log('test param: ', req.query.ex !== undefined);
      if (req.query.ex !== undefined) {
        var code = '((ctx) => { console.log("testValue: ", ctx.testValue); ctx.res.writeHead(200, {"Content-Type": "text/html"}); ctx.res.end("<h1>LOLZ - "+ctx.testValue+"</h1>"); })(ctx);';
        var your_code = new Function(['ctx'].join(','), code);

        try {
          your_code({ req, res, testValue: 'trster' });
        }
        catch (executionException) {
          res.writeHead(200, {
            'Content-Type': 'text/html'
          });
          res.end('<h1>Error executing lambda expression: ' + executionException + '</h2>');
        }

      }
      else {
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
          if (files[0].content_type === 'lambda') {
            var code = '((req, res) => { ' + files[0].content + ' })(req, res);';
            var your_code = new Function(['req', 'res'].join(','), code);
            your_code(req, res);
          }
          else {
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
      setTimeout(function() {
        if (req.query.error) {
          reject(req.query.error);
        }
        else {
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
router.post('/fileupload', jwtCookiePasser.authRequired(), (req, res) => {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    var filePath = files.filetoupload.path;
    console.log('filePath: ', filePath, files.filetoupload.name);

    //var text = fs.readFileSync(files.filetoupload.path,'utf8')
    //fileService


    fs.readFile(files.filetoupload.path, async(err, data) => {
      if (err) {
        console.log('err loading file: ', err);
        res.redirect('/');
        return;
      }

      let game;
      const subdomain = tools.getSubdomain(req.get('host'));
      if (subdomain !== undefined) {
        game = await tools.getGame(subdomain);

        fileService.createGameDriver(req.user.id, { name: subdomain, data, game }, function(err) {
          if (err) {
            console.log('err persisting game driver: ', err);
            res.redirect('/');
          }
          else {
            console.log('game driver persisted');
            res.redirect('/play');
          }
        });
      }
      else {
        fileService.createFile(req.user.id, { name: files.filetoupload.name, content: data, content_type: 'text/html', game }, function(err) {
          if (err) {
            console.log('err persisting file: ', err);
          }
          else {
            console.log('file persisted');
          }
          res.redirect('/');
        });
      }
    });
  });
});







const gameService = new(require('./utils/orm/services/gameService.js')).GameService({ ormHelper, yourSql, debug: true, subEntities: [(require('./utils/orm/entities/gameModels/blah.js')).Entity] });
router.post('/createGame', jwtCookiePasser.authRequired(), urlencodedParser, function(req, res) {
  gameService.createGameAndSchema(req.body.game, req.user.id).then(game => {
    res.redirect(req.protocol + '://' + req.body.game+ '.' + tools.DEFAULT_HOST);
  }).catch(err => {
    res.json(500, { err });
  });
});





router.get('/api/login', function(req, res) {
  userService.login(req, res);
});

router.get('/api/addUser', function(req, res) {
  userService.createUser(req, res);
});


router.get("/public", function(req, res) {
  res.json({ message: "Public Success!", user: req.user });
});

router.get("/secret", jwtCookiePasser.authRequired(), function(req, res) {
  res.json({ message: "Secret Success!", user: req.user });
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
