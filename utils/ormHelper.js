/* jshint node:true */ /* global define, escape, unescape */
"use strict";

class OrmHelper {
	constructor(ip, user, password, database) {
		this.orm = require('orm');
		this.password = password;
		this.ip = ip;
		this.user = user;
		this.database = database;
		this.entities = [];
		this.entities.push((require('./orm/entities/role.js')).Entity);
		this.entities.push((require('./orm/entities/user.js')).Entity);
		this.models = {};
		this.modelDefinitions = {};
	}
	
	getModels(){
		return this.models;
	}
	
	getModelDefinitions(){
		return this.modelDefinitions;
	}

	sync() {

		var entities = this.entities;
		var database = this.database;
		var ip = this.ip;
		var user = this.user;
		var models = this.models;
		var modelDefinitions = this.modelDefinitions;

		this.orm.connect("mysql://" + user + ":" + this.password + "@" + ip + "/" + database, function(err, db) {
			if (err) throw err;

			entities.forEach(function(entity) {
				console.log('Defing table: ' + database + "." + entity.name);
				var model = db.define(entity.name, entity.definition, entity.helpers);

				if (entity.hasOne !== undefined && entity.hasOne !== null && entity.hasOne.length > 0) {
					entity.hasOne.forEach(function(owner) {
						if (models[owner.name] !== undefined && models[owner.name] !== null) {
							model.hasOne(owner.name, models[owner.name], owner.options);
						}else{
							console.log('Database owner not found: ' + owner.name);
						}
					});
				}

				if (entity.hasMany !== undefined && entity.hasMany !== null && entity.hasMany.length > 0) {
					entity.hasMany.forEach(function(other) {
						if (models[other.name] !== undefined && models[other.name] !== null) {
							model.hasMany(other.desc, models[other.name], other.meta, other.options);
						}
					});
				}

				if (entity.extendsTo !== undefined && entity.extendsTo !== null && entity.extendsTo.length > 0) {
					entity.extendsTo.forEach(function(extension) {
						model.extendsTo(extension.name, extension.data);
					});
				}

				models[entity.name] = model;
				modelDefinitions[entity.name] = entity.definition;
			});

			db.sync(function(err) {
				if (err) {
					console.log('Sync err: ' + err);
				}
				
				entities.forEach(function(entity) {
					if (entity.defaultData !== undefined && entity.defaultData !== null && entity.defaultData.length > 0) {
						entity.defaultData.forEach(function(defaultDatum) {
							models[entity.name].find({
					          id: defaultDatum.id
					        }, function(err, rows) {
					          if (err) throw err;
					          
					          if(rows.length > 0){
					          	
					          	var different = false;
					          	
					          	var keys = Object.keys(defaultDatum);
					          	for (var i = 0; i < keys.length; i++) { 
								    if(rows[0][keys[i]] === undefined){
								    	different = true;
								    }else{
								    	different = rows[0][keys[i]] !== defaultDatum[keys[i]];
								    }
								    	
								    if(different)
								    	break;
								}
								
								if(different){
									console.log('Difference located. Updating ['+entity.name+']: ' + defaultDatum.id);
						          	Object.assign(rows[0], defaultDatum);
						            rows[0].save(function (err) {
						            	if (err) throw err;
						            });
								}
					          	
					          	
					            
					          }else{
					          	console.log('Creating ['+entity.name+']: ' + defaultDatum.id);
					            models[entity.name].create(defaultDatum, function(err){
					            	if (err) throw err;
					            });
					          }
					        });
						});
					}
				});
				
			});
		});
	}
}


try {
	exports.OrmHelper = OrmHelper;
}
catch (err) {

}
