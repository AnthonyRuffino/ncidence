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
hasOne.push({
    name: 'user',
    altName: 'owner',
    options: {
        required: false,
        reverse: 'owners',
        autoFetch : true
    }
});



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
    name: 'definition',
    data: {
        driver: String
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
        hasOne: {
            owner: { id: 1 }
        },
        extendsTo: {
            definition: {
                driver: 'test driver'
            }
        }
    });
})(defaultData)



/////////////
//EXPORTS////
/////////////
try {
    exports.Entity = {
        name: 'game',
        definition: definition,
        helpers: helpers,
        hasOne: hasOne,
        hasMany: hasMany,
        extendsTo: extendsTo,
        defaultData: defaultData
    };
}
catch (err) {
    console.log('Error exporting entity [game]. Error: ' + err);
}
