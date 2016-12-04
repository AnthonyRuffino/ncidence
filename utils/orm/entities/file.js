/////////////////////
//ENTITY DEFINITION//
/////////////////////
var definition = {
    name: {
        type: "text",
        size: 254,
        required: true
    },
    content_type: {
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
    }
}


////////////////////////////
//HAS ONE ASSOCIATIONS//////
////////////////////////////
var hasOne = [];
hasOne.push({
    name: 'user',
    options: {
        required: true
    }
});

var uniqueConstraints = [];
uniqueConstraints.push({columns: ['user_id','name']});


/////////////
//EXPORTS////
/////////////
try {
    exports.Entity = {
        name: 'file',
        definition: definition,
        helpers: null,
        hasOne: hasOne,
        hasMany: null,
        extendsTo: null,
        defaultData: null,
        uniqueConstraints: uniqueConstraints
    };
}
catch (err) {
    console.log('Error exporting entity [file]. Error: ' + err);
}
