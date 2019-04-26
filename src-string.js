/* jshint node:true */
"use strict";

const wrapTemplate = (code) =>
    `exports.upwrapExports = ({
   console, 
       global,
       module = {scrString},
       window = {},
       process = {},
       __dirname = '__dirname-not-supported', 
       __filename = '__filename-not-supported', 
       require = 'require-not-supported'
    }) => {
           ${code}
           return module.exports;
}`;

class SrcString {
    constructor({ contentSrc }) {
        this.requireFromString = require('require-from-string');
        this.contentSrc = contentSrc;
    }

    async getContent (context) {

        const entity = await this.contentSrc.getEntity(context);

        let exportsForType = {};

        if (entity && entity.content !== undefined) {
            try {

                console.debug(`Loading custom exports.`, ...context);

                exportsForType = this.requireFromString(
                    wrapTemplate(
                        entity.content.toString('utf8')
                    ));

                console.info(`Done Loading custom exports.`);
                return exportsForType;
            }
            catch (err) {
                console.error(`Error loading custom exports.`, err);
                return exportsForType;
            }
        }
    };
}

module.exports = SrcString;