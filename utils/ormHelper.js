/* jshint node:true */ /* global define, escape, unescape */
"use strict";

class OrmHelper {
	constructor({ ip, user, password, database, mySqlHelper, entities }) {
		this.orm = require('orm');
		this.password = password;
		this.ip = ip;
		this.user = user;
		this.database = database;
		this.mySqlHelper = mySqlHelper;
		this.entities = entities;
		this.map = {};
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


		this.orm.connect("mysql://" + user + ":" + this.password + "@" + ip + "/" + database, function(err, db) {
			if (err) throw err;

			let hasManyMap = {};
			entities.forEach(function(entity) {
				console.log('Defing table: ' + database + "." + entity.name);
				var model = db.define(entity.name, entity.definition, entity.helpers);

				iterate(entity.hasOne, (owner) => {
					if (exists(map[owner.name]) && exists(map[owner.name].model)) {
						model.hasOne(owner.name, map[owner.name].model, owner.options);
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

				iterate(entity.extendsTo, (extension) => {
					model.extendsTo(extension.name, extension.data);
				});

				map[entity.name] = { entity: entity, model: model };
			});

			db.sync(function(err) {
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
							map[entity.name].model.create(values, function(err, createdEntity) {
								if (err) {
									console.log('Error: ' + err);
									throw err;
								}
								if (exists(hasMany)) {
									var hasManyKeys = Object.keys(hasMany);
									if (exists(hasManyKeys)) {
										for (var i = 0; i < hasManyKeys.length; i++) {
											let hasManyKey = hasManyKeys[i];
											hasMany[hasManyKey].forEach(hasManyValue => {
												map[hasManyKey].model.find({
													id: hasManyValue.id
												}, function(err, rows) {
													if (err) throw err;

													if (rows.length > 0) {
														const accessor = hasManyMap[hasManyKey].options.accessor;
														const meta = hasManyMap[hasManyKey].meta && hasManyValue.meta ? hasManyValue.meta : {};
														const addMethodName = 'add' + (accessor ? accessor : (hasManyKey.charAt(0).toUpperCase() + hasManyKey.slice(1)));
														console.log(entity.name + '[' + createdEntity.id + '].' + addMethodName + '(' + rows[0].id + ')');

														createdEntity[addMethodName](rows[0], meta, function(err) {
															if (err) {
																console.log('Error adding role: ' + err);
															}
														});
													}
												});
											});
										}
									}
								}
							});
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
