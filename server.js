/*
    _   __     _     __                   
   / | / /____(_)___/ /__  ____  ________ 
  /  |/ / ___/ / __  / _ \/ __ \/ ___/ _ \
 / /|  / /__/ / /_/ /  __/ / / / /__/  __/
/_/ |_/\___/_/\__,_/\___/_/ /_/\___/\___/ 
*/
const constants = require('./constants');
global.__rootdir = __dirname + '/';
global.__publicdir = __dirname + '/client/';
require(global.__publicdir + 'asciiArt.js')();

//const LiteLifting = require('lite-lifting');
const LiteLifting = require('lite-lifting');
const liteLiftConfig = {
  appName: 'ncidence',
  schema: 'ncidence__aruffino_c9users_io',
  useLoggerPlusPlus: true,
  port: process.env.PORT,
  securePort: process.env.SECURE_PORT,
  dbUser: process.env.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root',
  dbSecret: process.env.MYSQL_ENV_MYSQL_ROOT_PASSWORD || 'c9mariadb',
  dbHost: process.env.MYSQL_PORT_3306_TCP_ADDR || '127.0.0.1',
  dbPort: '3306',
  jwtSecret: process.env.JWT_SECRET || 'jehfiuqwhfuhf23yr8923rijfowijfp',
  stormingConfig: {
    entities: (() => {
      const entities = LiteLifting.getEntities();
      entities.push(require('./utils/orm/entities/gameModels/character.js')());
      entities.push(require('./utils/orm/entities/game.js')());
      return entities;
    })()
  },
  freshCertConfig: process.env.SECURE_PORT && {
    sslKeyFile: process.env.sslKeyFile,
    sslDomainCertFile: process.env.sslDomainCertFile,
    sslCaBundleFile: process.env.sslCaBundleFile
  }
};

const liteLift = new LiteLifting(liteLiftConfig);


const {
  express,
  formidable,
  jwtCookiePasser,
  router,
  server,
  secureServer,
  storming,
  urlencodedParser,
  userService,
  yourSql
} = { ...liteLift };

const gameService = require('./utils/orm/services/gameService.js')({
  storming,
  yourSql,
  secrets: liteLiftConfig
});

liteLift.sync(start);

function start(err) {
  err && console.log('ERROR passed to start method: ' + err);
  //////////////////////
  // BEGIN SERVICES
  //////////////////////

  setTimeout(() => {
    //TODO: FIx ORM helper so this data is here by now on first start-up
    userService.getUserByUsername('admin', adminUser => {
      if (adminUser) {
        console.info("Creating Test Game");
        gameService.createGameAndSchema({
          name: 'test',
          userId: adminUser.id,
          ignoreTestExists: true
        });
      }
      else {
        console.error("ADMIN USER MISSING!!");
      }
    });
  }, 10000);


  //////////////////////
  // END SERVICES
  //////////////////////



  // Driver middleware
  const contentFromDb = new(require('./utils/middleware/contentFromDb.js'))(constants, gameService, {
    ['/driver.js']: 'driver', ['/common.js']: 'common' });
  router.use('/', (req, res, next) => { contentFromDb.handle(req, res, next); });

  // File system middleware
  router.use(require('no-extension')(global.__publicdir));
  router.use(express.static(global.__publicdir));




  ///////////////////////////////////////////
  // BEGIN SOCKET IO SETUP & JWT AUTH SETUP///
  ////////////////////////////////////////////
  console.log('---Socket IO');
  let SocketHub = require('socket-hub');
  
  var SrcString = require('src-string');
  const srcString = new SrcString({
    contentSrc: {
      getEntity: ({subdomain, type, filter = { version: 'test' }} ) => {
        gameService.getGameEntityRecord(subdomain, type, filter);
      }
    }
  });
  
  
  let socketIOHelper = new SocketHub({
    appName: 'ncidence',
    server: secureServer ? secureServer : server,
    tokenUtil: jwtCookiePasser,
    rootHost: constants.host,
    storming,
    
    subdomainContent: {
      getInfo: async(subdomain) => {
        let gameAndDatabaseTemp = await gameService.getGameAndDatabase(subdomain);
        const game = gameAndDatabaseTemp && gameAndDatabaseTemp.game ? gameAndDatabaseTemp.game : null;
        return {
          subdomain: subdomain,
          game,
          owner: (game ? game.owner.username : 'admin')
        };
      },
      getStorming: ({subdomain, refreshCache = false}) =>
        gameService.fetchCachedGameOrmHelper({gameName: subdomain, refreshCache })
      ,
      getAlternateContent: (context) => srcString.getContent(context),
      getContent: ({subdomain, type}) => {
        const filePath = (type === 'common' ? global.__publicdir : global.__rootdir) + type + '.js';
		  	console.info(`[${subdomain}] - Loading default exports for ${type}. filePath: ${filePath}`);
		  	return require(filePath);
      }
    },
  });
  socketIOHelper.init();
  gameService.setSocketIOHelper(socketIOHelper);
  liteLift.socketBuddy = socketIOHelper;
  /////////////////////////////////////////
  // END SOCKET IO SETUP & JWT AUTH SETUP///
  /////////////////////////////////////////

  liteLift.start(() => {
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
  });




}
