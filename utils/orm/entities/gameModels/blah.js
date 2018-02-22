"use strict";

class Blah {
    constructor() {
        this.name = 'blah'
        
        this.definition = {
            name: {
                type: "text",
                size: 64,
                unique: true,
                required: true
            },
        };
        
        this.helpers = {
            methods: {
                //userNameAndEmail: function() {
                //    return this.username + ' (' + this.email + ')';
                //}
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
        this.defaultData.push({
            values:{
                id: 1,
                name: 'test',
            },
            extendsTo: {
                extension: {
                    thing: 'thingValue'
                }
            }
        });
        
    }
}

module.exports = () => new Blah();

