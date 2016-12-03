/////////////////////
//ENTITY DEFINITION//
/////////////////////
var orm = require("orm");
var definition = {
    val: {
        type: "text",
        size: 254,
        unique: true,
        required: true
    },
    expriration_date: {
        type: "date",
        time: true,
        required: true
    },
    type: {
        type: "enum",
        values: ["Signup", "Session"],
        required: true
    },
    client: {
        type: "enum",
        values: ["Browser", "App", "Other"],
        required: true
    }
}


/////////////////////
//ENTITY HELPERS/////
/////////////////////
var helpers = {
    methods: {

    },
    validations: {
        
    }
}


////////////////////////////
//HAS ONE ASSOCIATIONS//////
////////////////////////////
var hasOne = [];
hasOne.push({
    name: 'user',
    options: {
        required: false,
        reverse: 'tokens'
    }
});


////////////////////////////
//HAS MANY ASSOCIATIONS/////
////////////////////////////
var hasMany = [];
hasMany.push({

});


////////////////////////////
//EXTENDS TO  ASSOCIATIONS//
////////////////////////////
var extendsTo = [];
extendsTo.push({

});


//////////////////////
//DEFAULT DATA////////
//////////////////////
var defaultData = [];


/////////////
//EXPORTS////
/////////////
try {
    exports.Entity = {
        name: 'token',
        definition: definition,
        helpers: helpers,
        hasOne: hasOne,
        hasMany: null,
        extendsTo: null,
        defaultData
    };
}
catch (err) {
    console.log('Error exporting entity [token]. Error: ' + err);
}
