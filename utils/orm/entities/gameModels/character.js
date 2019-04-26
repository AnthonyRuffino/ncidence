"use strict";
class Character {
    constructor() {
        this.name = 'character'
        
        this.definition = {
            name: {
                type: "text",
                size: 16,
                required: true
            },
            user: {
                type: "text",
                size: 256,
                required: true
            },
            data: {
                type: "binary",
                required: false
            }
        };
        
        this.helpers = {
            methods: {
        
            },
            validations: {
                
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
                data1: {
                    type: "binary",
                    required: false
                }
            }
        });
        
        
        //////////////////////
        //DEFAULT DATA////////
        //////////////////////
        this.defaultData = [];
        ((defaultData) => {
            defaultData.push({
                values:{
                    id: 1,
                    name: 'admin',
                    user: 'admin',
                    data: `{"x":-500, "y":-500, "angle": 45}`
                },
                extendsTo: {
                    extension: {
                        data: `{"x":500, "y":500, "angle": 45}`
                    }
                }
            });
        })(this.defaultData);
        
        
    }
}

module.exports = () => new Character();

