"use strict";

class FileService {
    constructor(ormHelper) {
        this.ormHelper = ormHelper;
    }

    createGameDriver(userId, { name, data, game }, callback) {
        if (game !== undefined && game.game !== undefined) {
            if (userId !== game.game.owner_id) {
                callback('You are not the owner of this game and cannot edit the driver.');
            }
            else {
                console.log('updating old game: ' + name);
                game.definition.driver = data;
                game.definition.save(callback);
            }
        }
        else {
            console.log('creating new game: ' + name);
            var ormHelper = this.ormHelper;
            var gameORM = ormHelper.getMap()['game'];

            gameORM.model.create({ name: name, owner_id: userId }, function(err, createdGame) {
                if (err) {
                    callback(err);
                    return;
                }
                console.log('new game created: ' + name);
                const definition = { driver: data, game: createdGame };
                gameORM.extensions['definition'].create(definition, function(err, createdExtension) {
                    callback(err);
                    console.log('game definition created: ' + name);
                });

            });

        }

    }


    createFile(userId, file, callback) {

        var ormHelper = this.ormHelper;

        var fileModel = ormHelper.getMap()['file'].model;

        var fileData = {
            name: file.name,
            content_type: file.content_type,
            content: file.content,
            last_modified: new Date(),
            user_id: userId
        }


        fileModel.find({
            name: file.name,
            user_id: userId
        }, function(err, rows) {
            if (rows !== undefined && rows !== null && rows.length > 0) {
                Object.assign(rows[0], fileData);
                rows[0].save(function(err) {
                    callback(err);
                });
            }
            else {
                fileModel.create(fileData, function(err) {
                    callback(err);
                });
            }
        });
    }
}

try {
    exports.FileService = FileService;
}
catch (err) {

}
