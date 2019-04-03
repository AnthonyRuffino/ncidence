"use strict";

class Game {
    constructor() {
        this.name = 'game';
        
        this.definition = {
            name: {
                type: "text",
                size: 64,
                unique: true,
                required: true
            }
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
        this.hasOne.push({
            name: 'user',
            altName: 'owner',
            options: {
                required: true,
                reverse: 'games',
                autoFetch: true
            }
        });
        
        this.hasMany = [];
        
        //let uniqueConstraints = [];
        //uniqueConstraints.push({columns: ['role_id','user_id']});
        
        
        this.extendsTo = [];
        this.extendsTo.push({
            name: 'database',
            data: {
                password: {
                    type: "text",
                    size: 254,
                    unique: true,
                    required: true
                },
                mb: { type: 'number' }
            }
        });
        
        
        //////////////////////
        //DEFAULT DATA////////
        //////////////////////
        this.defaultData = [];
        // this.defaultData.push({
        //     values: {
        //         id: 1,
        //         name: 'test',
        //     },
        //     hasOne: {
        //         owner: { id: 1 }
        //     },
        //     extendsTo: {
        //         database: {
        //             password: 'test',
        //             mb: 0
        //         }
        //     }
        // });
    }
}

module.exports = () => new Game();
