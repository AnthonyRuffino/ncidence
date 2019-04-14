'use strict'

module.exports = class ContentFromDb {

    constructor(constants, gameService, fileNamesMap) {
        this.fileNamesMap = fileNamesMap || {};
        this.gameService = gameService;
        this.constants = constants;
        this.fs = require('fs');
    }

    async handle(req, res, next) {
        try{
            const subdomain = this.constants.getSubdomain(req.get('host'));

            const contentType = this.fileNamesMap[req.url];
            if (contentType && subdomain !== undefined) {
                let contentEntity = await this.gameService.getGameEntityRecord(subdomain, contentType, { version: this.constants.defaultGameVersion } );
                if(contentEntity && contentEntity.length > 0 && contentEntity[0].content) {
                    res.writeHead(200, {
                        'Content-Type': 'application/javascript'
                    });
                    res.end(contentEntity[0].content);
                } else {
                    next();
                    console.log(`serving default ${contentType}`);
                }
            }
            else {
                next();
            }
        } catch(err) {
            console.log('driver redirect bug err: ', err);
            next();
        }
    }



    updateGameFile (form, type, req, res) {
        form.parse(req, (err, fields, files) => {
            this.fs.readFile(files.filetoupload.path, async(err, content) => {
                if (err) {
                    console.log('err loading file: ', err);
                    res.redirect('/');
                    return;
                }

                const subdomain = this.constants.getSubdomain(req.get('host'));
                if (subdomain !== undefined) {

                    try {
                        await this.gameService.updateGameFile({ name: subdomain, userId: req.user.id, content, version: this.constants.defaultGameVersion, type });
                    } catch(err) {
                        console.log('err persisting game driver: ', err);
                        res.redirect('/');
                        return;
                    }

                    res.redirect('/play');

                }
            });
        });
    };
}