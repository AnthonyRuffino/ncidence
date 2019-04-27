const LiteLifting = require('lite-lifting');

const constants = { host: process.env.host };
constants.schema = LiteLifting.schema(constants.host);

global.__rootdir = __dirname + '/';
global.__publicdir = __dirname + '/client/';

const liteLiftConfig = {
  appName: process.env.appName,
  publicdir: global.__publicdir,
  schema: constants.schema,
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
  storming,
  yourSql,
  router
} = { ...liteLift };

const gameService = require('./utils/orm/services/gameService.js')({
  storming,
  yourSql,
  secrets: liteLiftConfig
});


liteLift.sync(start);

function start(err) {
  err && console.log('ERROR passed to start method: ' + err);
  
  liteLift.configureSocketHub({
    getEntity: ({ subdomain, type, filter = { version: 'test' } }) => {
      subdomain !== '#' && gameService.getGameEntityRecord(subdomain, type, filter);
    },
    rootHost: constants.host,
    getStorming: ({ subdomain, refreshCache = false }) =>
      gameService.fetchCachedGameOrmHelper({ gameName: subdomain, refreshCache }),
    getInfo: async(subdomain) => {
      let gameAndDatabaseTemp = await gameService.getGameAndDatabase(subdomain);
      const game = gameAndDatabaseTemp && gameAndDatabaseTemp.game ? gameAndDatabaseTemp.game : null;
      return {
        subdomain: subdomain,
        game,
        owner: (game ? game.owner.username : 'admin')
      };
    }
  });
  
  gameService.setSocketIOHelper(liteLift.socketHub);

  liteLift.start(() => {
    console.log('Start-up complete.');
    
    router.get("/public", function(req, res) {
      res.json({ message: "Public Success!", user: req.user });
    });
  });
}
