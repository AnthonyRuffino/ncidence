var argv = require('minimist')(process.argv.slice(2));

let yourSql = require('your-sql')();

let mySqlIp = argv.MYSQL_PORT_3306_TCP_ADDR || 'localhost';
let mySqlUser = argv.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root';
let mySqlPassword = argv.MYSQL_ENV_MYSQL_ROOT_PASSWORD || 'c9mariadb';

yourSql.init({
    host: mySqlIp,
    user: mySqlUser,
    password: mySqlPassword,
    database: 'mysql',
    connectionLimit: 100,
    debug: true
});

const main = () => {
    yourSql.query(`SHOW DATABASES`, (error, databases) => {
        if (error) {
            exit(error);
        }
        if (!databases || !databases.results) {
            exit('NO DATABASES FOUND');
        }
        console.log('>>>>>>>>>>>>>> START <<<<<<<<<<<<<<');
        console.log('');
    
        processAllDatabases(databases).then((results) => {
            deleteGames().then((results) => {
                exit();
            });
        });
    });
}


const deleteGames = () => {
    return new Promise((resolve, reject) => {
        yourSql.query(`DELETE FROM ncidence__aruffino_c9users_io.game_database`, (error, databases) => {
            if (error) {
                console.log('ISSUE DELETING GAME_DATABASE DEFINITIONS:', error);
                resolve();
                return;
            }
            
            console.log('GAMES DATABASE DEFINITIONS DELETED');
            
            yourSql.query(`DELETE FROM ncidence__aruffino_c9users_io.game`, (error, databases) => {
                if (error) {
                    console.log('ISSUE DELETING GAMES:', error);
                    resolve();
                    return;
                }
                console.log('GAMES DELETED');
                resolve();;
            });
            
        });
    });
};


const processDatabase = (database) => {
    return new Promise((resolve, reject) => {
        const droppingDatabase = `- Dropping database ${database}`;
        const droppingUser = `  Dropping user ${database}`;
        yourSql.query(`DROP DATABASE ${database}`, async(error, dropDatabaseError) => {
            if (error) {
                console.log(`Error ${droppingDatabase}!!!`, error);
            } else {
                console.log(droppingDatabase);
            }
            
            yourSql.query(`DROP USER '${database}'@'localhost'`, async(dropUserError, rows) => {
                if (error) {
                    console.log(`Error ${droppingUser}!!!`, dropUserError);
                }else if(rows){
                    console.log(droppingUser);
                }
                resolve();
            });
        });
    });
}

const processAllDatabases = (databases) => {
    const databasePromises = [];
    databases.results.forEach(database => {
        if(database.Database.startsWith('game_')) {
            const processResults = processDatabase(database.Database);
            databasePromises.push(processResults);
        }
    });
    return Promise.all(databasePromises);
}




const exit = (error) => {
    console.log('');
    console.log(error || '>>>>>>>>>>>>>>  END  <<<<<<<<<<<<<<');
    setTimeout(() => {
        process.exit(error ? 1 : 0);
    }, 1500)
}

main();
