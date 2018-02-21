var argv = require('minimist')(process.argv.slice(2));

let yourSql = new(require('./utils/yourSql.js')).YourSql();

let mySqlIp = argv.MYSQL_PORT_3306_TCP_ADDR || 'localhost';
let mySqlUser = argv.MYSQL_ENV_MYSQL_DATABASE_USER_NAME || 'root';
let mySqlPassword = argv.MYSQL_ENV_MYSQL_ROOT_PASSWORD || 'c9mariadb';


const exit = (error) => {
    console.log(!error ? '>>>>>>>>>>>>>>#######<<<<<<<<<<<<<<' : '');
    console.log(error || '>>>>>>>>>>>>>>SUCCESS<<<<<<<<<<<<<<');
    console.log(!error ? '>>>>>>>>>>>>>>#######<<<<<<<<<<<<<<' : '');
    setTimeout(() => {
        process.exit(error ? 1 : 0);
    }, 1500)
}



yourSql.init({
    host: mySqlIp,
    user: mySqlUser,
    password: mySqlPassword,
    database: 'mysql',
    connectionLimit: 100,
    debug: true
});


const processUser = (user) => {
    return new Promise((resolve, reject) => {
        yourSql.query(`select distinct User, Host, Db from db where User='${user.User}' and Host='${user.Host}' and Db='${user.User}'`, async(error, rows) => {
            if (error) {
                console.log('error', error);
                reject(error);
            }

            const dropUser = (callback) => {
                console.log('DROPPING USER: ' + user.User);
                yourSql.query(`DROP USER '${user.User}'@'${user.Host}'`, async(dropUserError, rows) => {
                    if (error) {
                        console.log('ERROR DROPPING User: ' + user.User, dropUserError);
                    }
                    callback();
                });
            }


            if (!rows || !rows.results) {
                dropUser(resolve);
            }
            else {
                dropUser(() => {
                    console.log('DROPPING Database: ' + user.User);
                    yourSql.query(`DROP DATABASE ${user.User}`, async(dropDatabaseError, rows) => {
                        if(dropDatabaseError) {
                            console.log('ERROR DROPPING Database: ' + user.User, dropDatabaseError);
                        }
                        resolve();
                    });
                });
            }
        });
    });
}

const processAllUsers = (users) => {
    const userPromises = [];
    users.results.forEach(user => {
        console.log('User:', user.User, user.Host);
        const processResults = processUser(user);
        userPromises.push(processResults);
    });
    return Promise.all(userPromises);
}

yourSql.query(`select distinct User, Host from mysql.user where User like 'game%'`, (error, rows) => {
    if (error) {
        exit(error);
    }
    if (!rows || !rows.results) {
        exit('No game_ users');
    }

    console.log('###################################');
    const users = processAllUsers(rows);

    users.then((results) => {
        console.log('###################################');
        exit();
    });
});
