/*
    _   __     _     __                   
   / | / /____(_)___/ /__  ____  ________ 
  /  |/ / ___/ / __  / _ \/ __ \/ ___/ _ \
 / /|  / /__/ / /_/ /  __/ / / / /__/  __/
/_/ |_/\___/_/\__,_/\___/_/ /_/\___/\___/ 
*/


//CONSTANTS
const constants = require('./constants');
global.__rootdir = __dirname + '/';
global.__publicdir = __dirname + '/client/';
require(global.__publicdir + 'asciiArt.js')();


// HI-JACK CONSOLE
require('./utils/hijack.js')({
  enabled: true, 
  enabledTypes: {
      log: true,
      error: true,
      debug: true,
      trace: true,
      warn: true,
      info: true,
  }
});



// SECRETS
const SECRETS = {
  jwtSecret: process.env.JWT_SECRET || 'jehfiuqwhfuhf23yr8923rijfowijfp',
  dbUser: process.env.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root',
  dbSecret: process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD || 'c9mariadb',
  dbHost: process.env.MYSQL_PORT_3306_TCP_ADDR || '127.0.0.1'
};


// REQUIRES
let http = require('http');
let express = require('express');
let fs = require('fs');
let yourSql = require('your-sql')();
let formidable = require('formidable');


// ROUTER AND SERVER
console.log('Configure Router');
let router = express();
let server = http.createServer(router);


// COOKIE PARSER
let cookieParser = require('cookie-parser');
router.use(cookieParser());

// BODY PARSER
let bodyParser = require('body-parser');
let urlencodedParser = bodyParser.urlencoded({ extended: false });
router.use(bodyParser.json());

// HOST COOKIE
router.use(require('./utils/middleware/hostCookie.js')('ncidence', (1000 * 60 * 60 * 24 * 365)));

// SECURE SERVER
const secureServer = require('./utils/middleware/secureServer.js')(fs, router);






//////////////////////
// BEGIN MYSQL CONFIG
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
    database: constants.schema,
    yourSql,
    entities,
    loadDefaultData: process.env.LOAD_DEFAULT_DATA || true
  });

console.log('LOADING mysql. ');
yourSql.createDatabase(constants.schema).then(() => {
  ormHelper.sync();
}).catch((err) => {
  console.log(err);
  ormHelper.sync();
});
//////////////////////
// END MYSQL CONFIG
//////////////////////


//////////////////////
// BEGIN SERVICES
//////////////////////
const userService = require('./utils/orm/services/userService.js')(ormHelper);
const gameService = require('./utils/orm/services/gameService.js')({ 
  ormHelper,
  yourSql,
  secrets: SECRETS 
});
//////////////////////
// END SERVICES
//////////////////////



// Driver middleware
const contentFromDb = new (require('./utils/middleware/contentFromDb.js'))(constants, gameService, {['/driver.js']: 'driver', ['/common.js']: 'common'});
router.use('/', (req, res, next) => { contentFromDb.handle(req, res, next); });

// File system middleware
router.use(require('no-extension')(global.__publicdir));
router.use(express.static(global.__publicdir));




///////////////////////////////////////////
// BEGIN SOCKET IO SETUP & JWT AUTH SETUP///
////////////////////////////////////////////
console.log('---Socket IO');
let jwtCookiePasser = new(require('jwt-cookie-passer')).JwtCookiePasser({
  domain: constants.host,
  secretOrKey: SECRETS.jwtSecret,
  expiresIn: constants.sessionExpiration,
  useJsonOnLogin: false,
  useJsonOnLogout: false
});

let socketIOHelper = require('./utils/socketIOHelper.js')({ 
  server: secureServer !== null ? secureServer : server,
  tokenUtil: jwtCookiePasser,
  gameService,
});
socketIOHelper.init();
gameService.setSocketIOHelper(socketIOHelper);

console.log('---JWT');
jwtCookiePasser.init({
  router,
  urlencodedParser,
  userService,
  loginLogoutHooks: socketIOHelper
});
/////////////////////////////////////////
// END SOCKET IO SETUP & JWT AUTH SETUP///
/////////////////////////////////////////


router.post('/uploadFrontend', jwtCookiePasser.authRequired(), (req, res) => {
    let form = new formidable.IncomingForm();
    contentFromDb.updateGameFile(form, 'driver', req, res);
});

router.post('/uploadBackend', jwtCookiePasser.authRequired(), (req, res) => {
    let form = new formidable.IncomingForm();
    contentFromDb.updateGameFile(form, 'backend', req, res);
});

router.post('/uploadCommon', jwtCookiePasser.authRequired(), (req, res) => {
    let form = new formidable.IncomingForm();
    contentFromDb.updateGameFile(form, 'common', req, res);
});





router.post('/createGame', jwtCookiePasser.authRequired(), urlencodedParser, function(req, res) {
  gameService.createGameAndSchema({ 
    name: req.body.game, 
    userId: req.user.id,
  }).then(game => {
    let port = constants.getPort(req.get('host'));
    port = port === '80' || !port ? '' : `:${port}`;
    res.redirect(req.protocol + '://' + req.body.game + '.' + constants.host + port);
    socketIOHelper.clearFromSubdomainInfoMap(req.body.game);
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
  console.log('Starting ncidence server...');
  let addr = server.address();
  console.log("Ncidence server listening at", addr.address + ":" + addr.port);
});
