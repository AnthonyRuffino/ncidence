/* jshint node:true */ /* global define, escape, unescape */
"use strict";

class MySqlHelper {
	constructor() {
		this.mysql = require('mysql');
		this.pool = null;
	}
	
	
	init(host, user, password, database) {
		this.pool = this.mysql.createPool({
			connectionLimit: 100, //important
			host: host,
			user: user,
			password: password,
			database: database,
			debug: false
		});
	}
	
	
	hasResults(rows) {
		return rows !== undefined && rows !== null && rows.length !== null && rows.length !== undefined && rows.length > 0;
	}
	
	
	createDatabase(database, callback) {
		this.pool.getConnection((err, connection) => {
			if (err) {
				console.log("Error in connection to database");
				return;
			}

			console.log('connected as id ' + connection.threadId);

			connection.query(`SHOW DATABASES LIKE '${database}'`, (err, rows) => {
				if (!err) {
					if (!this.hasResults(rows)) {
						console.log('Begin create schema ' + database);
						connection.query('CREATE SCHEMA ' + database, function(err, rows) {
							connection.release();
							if (err) {
								console.log('Error create schema ' + database + '; --> ERROR: ' + err);
							}
							else {
								console.log('Done creating schema - ' + database);
								callback();
							}
						});
					}
					else {
						console.log('Schema already exists: ' + database);
						callback();
					}
				}
				else {
					connection.release();
					console.log('Error creating checking for schema: ' + database + '; --> ERROR: ' + err);
				}

			});

			connection.on('error', function(err) {
				console.log("Error during while connecting to database: " + err);
				return;
			});
		});
	}
	
	
	getSchemaSizeInMb(schema, callback){
		var sizeQuery = "SELECT Round(Sum(data_length + index_length) / 1024 / 1024, 1) 'mb' FROM information_schema.tables WHERE table_schema = '" + schema + "'";
		this.query(sizeQuery, function(err,results){
			if(err){
				console.log('Error querying schema size' + JSON.stringify(err));
				callback(err);
			}else{
				if(results === undefined || results === null || results.results === undefined || results.results === null  || results.results[0] === undefined || results.results[0] === null){
					callback('No results for schema ' + schema);
				}else{
					callback(null, results.results[0].mb);
				}
			}
		})
	}
	
	
	createUniqueConstraint(schema, tableName, columns, callback) {
		const indexName = `uk_${tableName}_${columns.join('_')}`;
		const uniqueConstraintStatement = `alter table ${schema}.${tableName} add constraint ${indexName} UNIQUE (${columns.join(',')})`;
		
		const doesIndexExistQuery = `select distinct index_name from information_schema.statistics 
			        where table_schema = '${schema}' 
			        and table_name = '${tableName}' and index_name = '${indexName}'`;
		
		this.query(doesIndexExistQuery, (err, rows) => {
			if(err) {
				console.log('error checking if uniqueConstraint exists: ' + indexName + '. err: ' + err);
			} else if(rows !== undefined && rows !== null && this.hasResults(rows.results)) {
				console.log(indexName + ' already exists');
			} else {
				this.query(uniqueConstraintStatement, callback);
			}
		});
	}
	
	
	query(sql, callback) {
		if (sql !== undefined && sql !== null && sql.length > 0) {
			try {
				this.pool.getConnection(function(err, connection) {
					connection.release();
					if (err) {
						console.log("Error in connection to database");
						callback(null, {
							err: err,
							sql: sql,
							msg: 'Error during connection to database'
						})
					}
					else {
						connection.query(sql, function(err, results) {
							if (err) {
								callback({
									err: err,
									sql: sql,
									msg: 'Error during query'
								});
							}
							else {
								callback(null, {
									results: results,
									sql: sql
								});
							}
						});
					}
				});
			}
			catch (ex) {
				callback({
					err: ex,
					sql: sql,
					msg: 'Exception during connection to database'
				});
			}
		}
		else {
			callback({
				err: '"sql" paremeter was not provided'
			});
		}
	}
}

try {
	exports.MySqlHelper = MySqlHelper;
}
catch (err) {

}
