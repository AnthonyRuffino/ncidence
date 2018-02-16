/////////////////////
//ENTITY DEFINITION//
/////////////////////
var definition = {
    name: {
        type: "text",
        size: 60,
        unique: true
    },
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
var hasOne = null;


////////////////////////////
//HAS MANY ASSOCIATIONS/////
////////////////////////////
var hasMany = null;


////////////////////////////
//EXTENDS TO  ASSOCIATIONS//
////////////////////////////
var extendsTo = null;


//////////////////////
//DEFAULT DATA////////
//////////////////////
var defaultData = [];
defaultData.push({values: {
    id: 1,
    name: 'admin'
}});
defaultData.push({values: {
    id: 2,
    name: 'moderator'
}});
defaultData.push({values: {
    id: 3,
    name: 'user'
}})
defaultData.push({values: {
    id: 4,
    name: 'client'
}});


/////////////
//EXPORTS////
/////////////
try {
    exports.Entity = {
        name: 'role',
        definition: definition,
        helpers: helpers,
        hasOne: hasOne,
        hasMany: hasMany,
        extendsTo: extendsTo,
        defaultData: defaultData
    };
}
catch (err) {
    console.log('Error exporting entity [role]. Error: ' + err);
}
