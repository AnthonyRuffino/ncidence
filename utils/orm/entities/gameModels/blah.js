/////////////////////
//ENTITY DEFINITION//
/////////////////////
var definition = {
    name: {
        type: "text",
        size: 64,
        unique: true,
        required: true
    },
}


/////////////////////
//ENTITY HELPERS/////
/////////////////////
var helpers = {
    methods: {
        //userNameAndEmail: function() {
        //    return this.username + ' (' + this.email + ')';
        //}
    },
    validations: {
        //age: orm.enforce.ranges.number(0, undefined, "under-age")
    }
}


////////////////////////////
//HAS ONE ASSOCIATIONS//////
////////////////////////////
var hasOne = null;

hasOne = [];


////////////////////////////
//HAS MANY ASSOCIATIONS/////
////////////////////////////
var hasMany = [];

//var uniqueConstraints = [];
//uniqueConstraints.push({columns: ['role_id','user_id']});


////////////////////////////
//EXTENDS TO  ASSOCIATIONS//
////////////////////////////
var extendsTo = [];
extendsTo.push({
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
var defaultData = [];
((defaultData) => {
    defaultData.push({
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
})(defaultData)



/////////////
//EXPORTS////
/////////////
try {
    exports.Entity = {
        name: 'blah',
        definition: definition,
        helpers: helpers,
        hasOne: hasOne,
        hasMany: hasMany,
        extendsTo: extendsTo,
        defaultData: defaultData
    };
}
catch (err) {
    console.log('Error exporting entity [blah]. Error: ' + err);
}
