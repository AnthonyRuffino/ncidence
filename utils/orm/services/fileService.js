"use strict";

class FileService {
    constructor(ormHelper) {
        this.ormHelper = ormHelper;
    }


    createFile(userId, file, callback) {

        let ormHelper = this.ormHelper;

        let fileModel = ormHelper.getMap()['file'].model;

        let fileData = {
            name: file.name,
            content_type: file.content_type,
            content: file.content,
            last_modified: global.now(),
            user_id: userId
        };


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

module.exports = function(ormHelper) {
    return new FileService(ormHelper);
};
