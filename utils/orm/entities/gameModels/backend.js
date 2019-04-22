"use strict";
const now = () => new Date().toJSON().slice(0, 19).replace('T', ' ');
const crc32c = require('fast-crc32c');
class Backend {
    constructor() {
        this.name = 'backend'
        
        this.definition = {
            version: {
                type: "text",
                size: 254,
                required: true
            },
            content: {
                type: "binary",
                required: false
            },
            last_modified: {
                type: "date",
                time: true,
                required: true
            },
            etag : {
                type: "binary",
                size: 254,
                required: true
            }
        };
        
        this.helpers = {
            methods: {
                updateContent: (entity, content) => {
                    entity.last_modified = now();
                    entity.content = content;
                    entity.etag = crc32c.calculate(content);
                }
            },
            validations: {
                //age: orm.enforce.ranges.number(0, undefined, "under-age")
            }
        };
        
        this.hasOne = [];
        
        this.hasMany = [];
        
        //let uniqueConstraints = [];
        //uniqueConstraints.push({columns: ['role_id','user_id']});
        
        
        this.extendsTo = [];
        this.extendsTo.push({
            name: 'extension',
            data: {
                thing: {
                    type: "text",
                    size: 32,
                    required: false
                }
            }
        });
        
        
        //////////////////////
        //DEFAULT DATA////////
        //////////////////////
        this.defaultData = [];
        ((defaultData) => {
            const backendJavascript = `return class Backend{update(){} getSocketIOHooks(){return [];}}`;
            defaultData.push({
                values:{
                    id: 1,
                    version: 'test',
                    content: backendJavascript,
                    last_modified: now(),
                    etag : require('fast-crc32c').calculate(backendJavascript)
                },
                extendsTo: {
                    extension: {
                        thing: 'thingValue'
                    }
                }
            });
        })(this.defaultData);
        
        
    }
}

module.exports = () => new Backend();

