/* jshint node:true */ /* global define, escape, unescape */
"use strict";

class OrmHelper {
	constructor({ ip, user, password, database, mySqlHelper, entities, loadDefaultData }) {
		this.orm = require('orm');
		this.password = password;
		this.ip = ip;
		this.user = user;
		this.database = database;
		this.mySqlHelper = mySqlHelper;
		this.entities = entities;
		this.map = {};
		this.loadDefaultData = loadDefaultData;
	}

	getMap() {
		return this.map;
	}

	sync() {

		var entities = this.entities;
		var database = this.database;
		var mySqlHelper = this.mySqlHelper;
		var ip = this.ip;
		var user = this.user;
		var map = this.map;

		var exists = (thing) => {
			return thing !== undefined && thing !== null;
		}

		var isListy = (list) => {
			return exists(list) && list.length > 0;
		}
		var iterate = (list, action) => {
			if (isListy(list)) {
				list.forEach(function(item) {
					action(item);
				});
			}
		}
		var iterateKeys = (obj, action) => {
			if (exists(obj)) {
				var keys = Object.keys(obj);
				iterate(keys, action);
			}
		}
		
		var capFirstLetter = (word) => {
			return word.charAt(0).toUpperCase() + word.slice(1);
		}


		this.orm.connect("mysql://" + user + ":" + this.password + "@" + ip + "/" + database, (err, db) => {
			if (err) throw err;

			let hasManyMap = {};
			let hasOneMap = {};
			entities.forEach(function(entity) {
				console.log('Defing table: ' + database + "." + entity.name);
				var model = db.define(entity.name, entity.definition, entity.helpers);

				iterate(entity.hasOne, (owner) => {
					if (exists(map[owner.name]) && exists(map[owner.name].model)) {
						hasOneMap[owner.altName || owner.name] = map[owner.name].model;
						model.hasOne(owner.altName || owner.name, map[owner.name].model, owner.options);
					}
					else {
						console.log('Database owner not found: ' + owner.name);
					}
				});


				iterate(entity.hasMany, (other) => {
					if (exists(map[other.name]) && exists(map[other.name].model)) {
						hasManyMap[other.name] = other;
						model.hasMany(other.desc, map[other.name].model, other.meta || {}, other.options);
					}
				});
				
				const extensions = {};
				iterate(entity.extendsTo, (extension) => {
					extensions[extension.name] = model.extendsTo(extension.name, extension.data);
				});

				map[entity.name] = { entity: entity, model: model, extensions: extensions };
			});

			if(this.loadDefaultData) {
				console.log('Loading default data...')
			}
			
			!this.loadDefaultData ? console.log('Skipping default data loading...') : db.sync(function(err) {
				if (err) {
					console.log('Sync err: ' + err);
				}

				const processDatum = (entity, defaultDatum) => {

					const values = defaultDatum.values;
					map[entity.name].model.find({
						id: values.id
					}, function(err, rows) {
						if (err) throw err;

						if (rows.length > 0) {

							var different = false;

							var keys = Object.keys(values);
							for (var i = 0; i < keys.length; i++) {
								if (rows[0][keys[i]] === undefined) {
									different = true;
								}
								else {
									different = rows[0][keys[i]] !== values[keys[i]];
								}

								if (different)
									break;
							}

							if (different) {
								Object.assign(rows[0], values);
								rows[0].save(function(err) {
									if (err) throw err;
								});
							}



						}
						else {
							console.log('Creating [' + entity.name + ']: ' + values.id);
							let hasMany = defaultDatum.hasMany;
							let extendsTo = defaultDatum.extendsTo;
							var createEntity = (modelValues) => {
								map[entity.name].model.create(modelValues, function(err, createdEntity) {
									if (err) {
										console.log('Error: ' + err);
										throw err;
									}
									iterateKeys(hasMany, (hasManyKey) => {
										hasMany[hasManyKey].forEach(hasManyValue => {
											map[hasManyKey].model.find({
												id: hasManyValue.id
											}, function(err, rows) {
												if (err) throw err;

												if (rows.length > 0) {
													const accessor = hasManyMap[hasManyKey].options.accessor;
													const meta = hasManyMap[hasManyKey].meta && hasManyValue.meta ? hasManyValue.meta : {};
													const addMethodName = 'add' + (accessor ? accessor : capFirstLetter(hasManyKey));
													console.log(entity.name + '[' + createdEntity.id + '].' + addMethodName + '(' + rows[0].id + ')');

													createdEntity[addMethodName](rows[0], meta, function(err) {
														if (err) {
															console.log('Error adding role: ' + err);
														}
													});
												}
											});
										});
									});
									
									
									iterateKeys(extendsTo, (extendsToKey) => {
										extendsTo[extendsToKey][entity.name] = createdEntity;
										map[entity.name].extensions[extendsToKey].create(extendsTo[extendsToKey], function(err, createdExtension) {
											if (err) throw err;
											console.log('set extension: ', extendsToKey);
										});
									});
								});
							}
							
							
							let hasOne = defaultDatum.hasOne;
							var processHasOnes = async function(getHasOneData) {
								var hasOneKeys = Object.keys(hasOne);
								if (exists(hasOneKeys)) {
									for (var i = 0; i < hasOneKeys.length; i++) {
										
										let hasOneKey = hasOneKeys[i];
										try {
											var promiseData = await getHasOneData(hasOne[hasOneKey].id, hasOneMap[hasOneKey]);
											values[hasOneKey] = promiseData;
											values[hasOneKey + '_id'] = promiseData.id;
										}
										catch (error) {
											console.log('Error adding hasOne default data: ', error);
										}
									}
								}
								createEntity(values);
							}
							
							if (exists(hasOne)) {
								processHasOnes((id, model) => {
									return new Promise(function(resolve, reject) {
										model.find( { id }, function(err, rows) {
											if(err) {
												reject(err);
											}
											resolve(rows[0]);
										});
									});
								});
							} else {
								createEntity(values);
							}

						}
					});
				}

				iterate(entities, function(entity) {
					iterate(entity.defaultData, (defaultDatum) => {
						processDatum(entity, defaultDatum);
					});

					iterate(entity.uniqueConstraints, (uniqueConstraint) => {
						if (isListy(uniqueConstraint.columns)) {

							console.log('Creating unique constraint: ' + entity.name);
							mySqlHelper.createUniqueConstraint(database, entity.name, uniqueConstraint.columns, (err) => {
								if (err)
									console.log('Error creating unique constraint: ' + JSON.stringify(err));
							});
						}
					});

				});

				iterate(entities, function(entity) {
					iterate(entity.hasMany, (other) => {
						if (exists(map[other.name]) && exists(map[other.name].model)) {
							if (other.options.key) {
								const jointTableName = entity.name + "_" + other.desc;

								console.log('Creating unique constraint during hasMany processing: ' + jointTableName);
								mySqlHelper.createUniqueConstraint(database, jointTableName, [other.name + "_id", entity.name + "_id"], (err) => {
									if (err)
										console.log('Error creating unique constraint during hasMany processing: ' + JSON.stringify(err));
								});
							}
						}
					});
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
