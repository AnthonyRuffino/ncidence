/* jshint node:true */ /* global define, escape, unescape */
"use strict";

class OrmHelper {
	constructor(ip, user, password, database, mySqlHelper) {
		this.orm = require('orm');
		this.password = password;
		this.ip = ip;
		this.user = user;
		this.database = database;
		this.mySqlHelper = mySqlHelper;
		this.entities = [];
		this.entities.push((require('./orm/entities/role.js')).Entity);
		this.entities.push((require('./orm/entities/user.js')).Entity);
		this.entities.push((require('./orm/entities/file.js')).Entity);
		this.entities.push((require('./orm/entities/token.js')).Entity);
		this.entities.push((require('./orm/entities/captcha.js')).Entity);
		this.map = {};
	}
	
	getMap(){
		return this.map;
	}

	sync() {

		var entities = this.entities;
		var database = this.database;
		var mySqlHelper = this.mySqlHelper;
		var ip = this.ip;
		var user = this.user;
		var map = this.map;

		this.orm.connect("mysql://" + user + ":" + this.password + "@" + ip + "/" + database, function(err, db) {
			if (err) throw err;

			entities.forEach(function(entity) {
				console.log('Defing table: ' + database + "." + entity.name);
				var model = db.define(entity.name, entity.definition, entity.helpers);

				if (entity.hasOne !== undefined && entity.hasOne !== null && entity.hasOne.length > 0) {
					entity.hasOne.forEach(function(owner) {
						if (map[owner.name] !== undefined && map[owner.name] !== null && map[owner.name].undefined !== null && map[owner.name].model !== null) {
							model.hasOne(owner.name, map[owner.name].model, owner.options);
						}else{
							console.log('Database owner not found: ' + owner.name);
						}
					});
				}

				if (entity.hasMany !== undefined && entity.hasMany !== null && entity.hasMany.length > 0) {
					entity.hasMany.forEach(function(other) {
						if (map[other.name] !== undefined && map[other.name] !== null && map[other.name].undefined !== null && map[other.name].model !== null) {
							model.hasMany(other.desc, map[other.name].model, other.meta, other.options);
						}
					});
				}

				if (entity.extendsTo !== undefined && entity.extendsTo !== null && entity.extendsTo.length > 0) {
					entity.extendsTo.forEach(function(extension) {
						model.extendsTo(extension.name, extension.data);
					});
				}

				map[entity.name] = { entity: entity, model: model };
			});

			db.sync(function(err) {
				if (err) {
					console.log('Sync err: ' + err);
				}
				
				entities.forEach(function(entity) {
					if (entity.defaultData !== undefined && entity.defaultData !== null && entity.defaultData.length > 0) {
						entity.defaultData.forEach(function(defaultDatum) {
							map[entity.name].model.find({
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
					            map[entity.name].model.create(defaultDatum, function(err){
					            	if (err) throw err;
					            });
					          }
					        });
						});
					}
					
					//compound unique constraints
					if (entity.uniqueConstraints !== undefined && entity.uniqueConstraints !== null && entity.uniqueConstraints.length > 0) {
						entity.uniqueConstraints.forEach(function(uniqueConstraint) {
							if(uniqueConstraint.columns !== undefined && uniqueConstraint.columns !== null && uniqueConstraint.columns.length > 0){
								var statement = 'alter table '+database + '.' + entity.name+' add constraint uk_'+entity.name+'_'+uniqueConstraint.columns.join('_')+' UNIQUE ('+uniqueConstraint.columns.join(',')+')';
								mySqlHelper.query(statement, function(results, err){
									if(err)
										console.log('Error creating unique constraint: ' + JSON.stringify(err));
								});
							}
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
