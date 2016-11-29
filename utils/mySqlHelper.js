/* jshint node:true *//* global define, escape, unescape */
"use strict";

class MySqlHelper {
  constructor() {
	  this.mysql = require('mysql');
	  this.pool = null;
  }
  
  init(host, user, password, database){
	  this.pool = this.mysql.createPool({
		  connectionLimit : 100, //important
		  host     : host,
		  user     : user,
		  password : password,
		  database : database,
		  debug    :  false
	  });
  }
  
  createDatabase(database, callback) {
	    this.pool.getConnection(function(err,connection){
	        if (err) {
	        	console.log("Error in connection to database");
	        	return;
	        }

	        console.log('connected as id ' + connection.threadId);
	        
	        connection.query('SHOW DATABASES LIKE \''+database+'\'', function(err, rows) {
	            if(!err) {
	            	var hasResults = rows !== undefined && rows !== null && !rows.length !== null && !rows.length !== undefined  && !rows.length < 1;
	                if(hasResults === false){
	                  console.log('Begin create schema ' + database);
	                  connection.query('CREATE SCHEMA '+database, function(err, rows) {
	                	connection.release();
	                    if (err){
	                      console.log('Error create schema ' + database + '; --> ERROR: '+ err);
	                    }else{
	                      console.log('Done creating schema - ' + database);
	                      callback();
	                    }
	                  });
	                }else{
	                	console.log('Schema already exists: ' + database );
	                	callback();
	                }
	            }else{
	            	connection.release();
	            	console.log('Error creating checking for schema: ' + database + '; --> ERROR: '+ err);
	            }
	            
	        });

	        connection.on('error', function(err) {     
	        	console.log("Error during while connecting to database: " + err);
	             return;
	        });
	  });
	}
  
  query(sql, callback){
	  if(sql !== undefined && sql !== null && sql.length > 0){
		try{
		  this.pool.getConnection(function(err,connection){
			  connection.release();
		      if (err) {
		    	  console.log("Error in connection to database");
		    	  callback(null, { err: err, sql: sql, msg: 'Error during connection to database' })
		      }else{
				  connection.query(sql, function(err, result) {
				      if (err){
				          callback(null, { err: err, sql: sql, msg: 'Error during query'});
				      }else{
				          callback({ result: result, sql: sql });
				      }
				  });
		      }
		  });
		}catch(ex){
		  callback(null, { err: ex, sql: sql, msg: 'Exception during connection to database' });
		}
	  }else{
		  callback(null, { err: '"sql" paremeter was not provided' });
	  }
  }
}

try {
    exports.MySqlHelper = MySqlHelper;
}
catch(err) {
    
}