console.log('..........................................................');
console.log('..........................................................');
console.log('..........................................................');
console.log('....................@Launching Ncidence@..................');
console.log('..........................................................');
console.log('..........................................................');
console.log('..........................................................');

String.prototype.replaceAll = function(search, replacement) {
  let target = this;
  return target.split(search).join(replacement);
};

//GLOBALS
global.__debug = false;
global.__defaultGameVersion = 'test';
global.__schema = process.env.DEFAULT_SCHEMA || 'ncidence__aruffino_c9users_io';
global.__host = global.__schema.replaceAll('__', '-').replaceAll('_', '.');
global.__base = __dirname + '/';
global.__publicdir = __dirname + '/client';
global.__sessionExpiration = process.env.SESSION_EXP_SEC || (60 * 60 * 24 * 7);
global.__QUERY_ROWS_LIMIT = 10000;
global.__CAPTCHA_EXP_IN_MINUTES = 5;
global.__getSubdomain = (host) => {
  host = host.indexOf(':') > -1 ? host.substring(0, host.indexOf(':')) : host;
  let subdomain;
  if (global.__host !== host && host.endsWith("." + global.__host)) {
    subdomain = host.substring(0, host.indexOf("." + global.__host));
  }
  return subdomain;
};


//SECRETS
const SECRETS = {
  jwtSecret: process.env.JWT_SECRET || 'jehfiuqwhfuhf23yr8923rijfowijfp',
  dbUser: process.env.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root',
  dbSecret: process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD || 'c9mariadb',
  dbHost: process.env.MYSQL_PORT_3306_TCP_ADDR || 'localhost'
};


//REQUIRES
let http = require('http');
let express = require('express');
let fs = require('fs');
let uuidv4 = require('uuid/v4');
let yourSql = require('your-sql')();
let formidable = require('formidable');
let captchapng = require('captchapng');


//ROUTER AND SERVER
console.log('Configure Router');
let router = express();
let server = http.createServer(router);


//COOKIE PARSER
let cookieParser = require('cookie-parser');
router.use(cookieParser());

//BODY PARSER
let bodyParser = require('body-parser');
let urlencodedParser = bodyParser.urlencoded({ extended: false });
router.use(bodyParser.json());

//HOST COOKIE
router.use(require('./utils/middleware/hostCookie.js')('ncidence', (1000 * 60 * 60 * 24 * 365)));

//SECURE SERVER
const secureServer = require('./utils/middleware/secureServer.js')(fs, router);


//Driver middleware
router.use('/', async(req, res, next) => {
  
  try{
    const subdomain = global.__getSubdomain(req.get('host'));
    if (req.url === '/driver.js' && subdomain !== undefined) {
      
      res.writeHead(200, {
        'Content-Type': 'application/javascript'
      });
      
      let driver = await gameService.getGameEntityRecord(subdomain, 'driver', { version: global.__defaultGameVersion } );
      if(driver && driver.content) {
        res.end(driver.content);
      } else {
        next();
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! serving default driver');
        // fs.readFile(global.__publicdir + "/driver.js", "utf8", function(err, defaultDriver) {
        //   if(err) {
        //     console.log('error getting default driver');
        //     next();
        //   }
        //   res.end(defaultDriver);
        // });
      }
    }
    else {
      next();
    }
  } catch(err) {
    console.log('driver redirect bug err: ', err);
    next();
  }

});

//File system middleware
router.use(require('no-extension')(global.__publicdir));
router.use(express.static(global.__publicdir));



//////////////////////
//BEGIN MYSQL CONFIG
//////////////////////
yourSql.init({
  host: SECRETS.dbHost,
  user: SECRETS.dbUser,
  password: SECRETS.dbSecret,
  database: 'mysql',
  connectionLimit: 100,
  debug: true
});

const entities = [];
entities.push(require('./utils/orm/entities/role.js')());
entities.push(require('./utils/orm/entities/user.js')());
entities.push(require('./utils/orm/entities/file.js')());
entities.push(require('./utils/orm/entities/token.js')());
entities.push(require('./utils/orm/entities/captcha.js')());
entities.push(require('./utils/orm/entities/game.js')());

const ormHelper = require('./utils/ormHelper.js')({
    ip: SECRETS.dbHost,
    user: SECRETS.dbUser,
    password: SECRETS.dbSecret,
    database: global.__schema,
    yourSql,
    entities,
    loadDefaultData: process.env.LOAD_DEFAULT_DATA || true
  });

console.log('LOADING mysql. ');
yourSql.createDatabase(global.__schema).then(() => {
  ormHelper.sync();
}).catch((err) => {
  console.log(err);
  ormHelper.sync();
});
//////////////////////
//END MYSQL CONFIG
//////////////////////


//////////////////////
//BEGIN SERVICES
//////////////////////
const userService = require('./utils/orm/services/userService.js')(ormHelper);
const fileService = require('./utils/orm/services/fileService.js')(ormHelper);
const gameService = require('./utils/orm/services/gameService.js')({ 
  ormHelper, 
  yourSql, 
  debug: global.__debug, 
  secrets: SECRETS 
});
//////////////////////
//END SERVICES
//////////////////////








///////////////////////////////////////////
//BEGIN SOCKET IO SETUP & JWT AUTH SETUP///
////////////////////////////////////////////
console.log('---Socket IO');
let jwtCookiePasser = new(require('jwt-cookie-passer')).JwtCookiePasser({
  domain: global.__host,
  secretOrKey: SECRETS.jwtSecret,
  expiresIn: global.__sessionExpiration,
  useJsonOnLogin: false,
  useJsonOnLogout: false
});

let socketIOHelper = require('./utils/socketIOHelper.js')({ 
  server: secureServer !== null ? secureServer : server,
  tokenUtil: jwtCookiePasser,
  gameService,
  debug: global.__debug
});
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



router.get('/api/roles', function(req, res) {

  let query = {};
  let options = {};
  let limit = null;
  let order = [];
  let isIdSearch = false;

  let role = ormHelper.getMap()['role'];
  let entity = role.entity;
  let definition = entity.definition;
  let model = role.model;

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
      let offset = Number(req.query[key]);
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
      let fieldName = key.substr(2);
      
      if (entity.hasOne !== undefined && entity.hasOne !== null && entity.hasOne.length > 0) {
				entity.hasOne.forEach(function(owner) {
					
				});
			}
			*/
    }
  });

  if (limit === null || isNaN(limit) || limit > global.__QUERY_ROWS_LIMIT) {
    limit = global.__QUERY_ROWS_LIMIT;
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
            let resObj = {
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
  let name = req.params.name;
  let file = req.params.file;

  ormHelper.getMap()['user'].model.find({ username: name }, function(err, users) {
    if (err || users === undefined || users == null || users.length < 1 || users[0] === undefined || users[0] === null) {

      console.log('test param: ', req.query.ex !== undefined);
      if (req.query.ex !== undefined) {
        let code = '((ctx) => { console.log("testValue: ", ctx.testValue); ctx.res.writeHead(200, {"Content-Type": "text/html"}); ctx.res.end("<h1>LOLZ - "+ctx.testValue+"</h1>"); })(ctx);';
        let your_code = new Function(['ctx'].join(','), code);

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
            let code = '((req, res) => { ' + files[0].content + ' })(req, res);';
            let your_code = new Function(['req', 'res'].join(','), code);
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




router.get('/api/captcha', function(req, res) {

  let number = parseInt(Math.random() * 900000 + 100000);
  let captchaId = uuidv4().substring(0, 4);
  let expDate = new Date((new Date()).getTime() + global.__CAPTCHA_EXP_IN_MINUTES * 60000);

  let captchaModel = ormHelper.getMap()['captcha'].model;

  captchaModel.create({ guid: captchaId, answer: number + '', expiration_date: expDate }, function(err) {
    if (err) {
      res.json(500, {
        err: 'Error creating CAPTCHA: ' + err
      });
    }
    else {
      let p = new captchapng(80, 30, number); // width,height,numeric captcha 
      p.color(0, 0, 0, 0); // First color: background (red, green, blue, alpha) 
      p.color(80, 80, 80, 255); // Second color: paint (red, green, blue, alpha)

      let img = p.getBase64();
      let imgbase64 = new Buffer(img, 'base64');
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'captcha-id': captchaId
      });
      res.end(imgbase64);
    }

  });

});


router.post('/fileupload', jwtCookiePasser.authRequired(), (req, res) => {
  let form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    let filePath = files.filetoupload.path;

    fs.readFile(files.filetoupload.path, async(err, content) => {
      if (err) {
        console.log('err loading file: ', err);
        res.redirect('/');
        return;
      }

      let game;
      const subdomain = global.__getSubdomain(req.get('host'));
      if (subdomain !== undefined) {
        
        try {
          await gameService.updateGameDriver({ name: subdomain, userId: req.user.id, content, version: global.__defaultGameVersion });
        } catch(err) {
          console.log('err persisting game driver: ', err);
          res.redirect('/');
          return;
        }
        
        res.redirect('/play');
        
      }
      else {
        fileService.createFile(req.user.id, { name: files.filetoupload.name, content, content_type: 'text/html', game }, function(err) {
          if (err) {
            console.log('err persisting file: ', err);
          }
          res.redirect('/');
        });
      }
    });
  });
});




router.post('/createGame', jwtCookiePasser.authRequired(), urlencodedParser, function(req, res) {
  gameService.createGameAndSchema({ 
    name: req.body.game, 
    userId: req.user.id,
  }).then(game => {
    res.redirect(req.protocol + '://' + req.body.game + '.' + global.__host);
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
      let addr = secureServer.address();
      console.log("Secure server listening at", addr.address + ":" + addr.port);
    });
  }
  catch (err2) {
    console.log("Err: " + err2);
    //secureServerErr = "Err: " + err2;
  }
}


if (server === undefined || server === null) {
  server = http.createServer(router);
}


server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
  console.log('trying to listen...');
  let addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
