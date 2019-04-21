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
global.now = () => new Date().toJSON().slice(0, 19).replace('T', ' ');
require(global.__publicdir + 'asciiArt.js')();


let gameService = null;
const liteLiftingConfig = {
  appName: constants.schema,
  host: constants.host,
  publicdir: global.__publicdir,
  port: process.env.PORT,
  ip: process.env.IP,
  securePort: null,
  secureIP: null,
  dbUser: process.env.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root',
  dbSecret: process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD || 'c9mariadb',
  dbHost: process.env.MYSQL_PORT_3306_TCP_ADDR || '127.0.0.1',
  dbPort: '3306',
  jwtSecret: process.env.JWT_SECRET || 'jehfiuqwhfuhf23yr8923rijfowijfp',
  sessionExpiration: constants.sessionExpiration,
  useHostCookie: true,
  useJwtCookiePasser: true,
  useLoggerPlusPlus: true,
  useNoExtension: true,
  usePublicPrivateTests: true,
  userService: undefined,
  useSocketBuddy: false,
  useYourSql: true,
  useStorming: true,
  loglevels: ['info', 'warn', 'error'],
  socketBuddyInstance: (ll) => {
    gameService = require('./utils/orm/services/gameService.js')({ 
      ormHelper: ll.storming,
      yourSql: ll.yourSql,
      secrets: liteLiftingConfig 
    });
    
    let socketIOHelper = require('./utils/socketIOHelper.js')({ 
      server: ll.secureServer !== null ? ll.secureServer : ll.server,
      tokenUtil: ll.jwtCookiePasser,
      gameService,
    });
    socketIOHelper.init();
    gameService.setSocketIOHelper(socketIOHelper);
    return socketIOHelper;
  },
  routerHooks: [
    ({router})=>{
      const contentFromDb = new (require('./utils/middleware/contentFromDb.js'))(constants, gameService, {['/driver.js']: 'driver', ['/common.js']: 'common'});
      router.use('/', (req, res, next) => { contentFromDb.handle(req, res, next); });
    }]
};


const entities = [];
entities.push(require('./utils/orm/entities/role.js')());
entities.push(require('./utils/orm/entities/user.js')());
entities.push(require('./utils/orm/entities/file.js')());
entities.push(require('./utils/orm/entities/token.js')());
entities.push(require('./utils/orm/entities/captcha.js')());
entities.push(require('./utils/orm/entities/game.js')());
entities.push(require('./utils/orm/entities/gameModels/character.js')());
liteLiftingConfig.stormingConfig = { entities, loadDefaultData: true };
    
const liteLifting = require('./liteLifting.js')(liteLiftingConfig);

const { 
  router,
  formidable,
  jwtCookiePasser,
  storming,
  urlencodedParser
} = { ...liteLifting };




const start = (addresses) => {
  console.log('Lite lifting addresses', addresses);
  //////////////////////
  // BEGIN SERVICES
  //////////////////////
  const userService = require('./utils/orm/services/userService.js')(storming);
  liteLifting.userService = userService;
  setTimeout(() => {
    //TODO: FIx ORM helper so this data is here by now on first start-up
    userService.getUserByUsername('admin', adminUser => {
      if(adminUser) {
        console.info("Creating Test Game");
        gameService.createGameAndSchema({
          name: 'test', 
          userId: adminUser.id,
          ignoreTestExists: true
        });
      } else {
        console.error("ADMIN USER MISSING!!");
      }
    });
  }, 10000);
  
  
  //////////////////////
  // END SERVICES
  //////////////////////
  
  
  
  // Driver middleware
  const contentFromDb = new (require('./utils/middleware/contentFromDb.js'))(constants, gameService, {['/driver.js']: 'driver', ['/common.js']: 'common'});
  
  
  
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
      liteLifting.socketBuddy.clearFromSubdomainInfoMap(req.body.game);
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
};


liteLifting.start(start);
