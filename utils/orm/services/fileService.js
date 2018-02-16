"use strict";

class FileService {
    constructor(ormHelper) {
        this.ormHelper = ormHelper;
    }
    
    


    createFile(file, callback) {

        var ormHelper = this.ormHelper;

        var userModel = ormHelper.getMap()['file'].model;
        
        
        var fileData = {
            name: file.name,
            content_type: file.content_type,
            content: file.content,
            last_modified: new Date(),
            user_id: 1
        }
    
        userModel.create(fileData, function(err) {
            callback(err);
        });
    }
}

try {
    exports.FileService = FileService;
}
catch (err) {

}
