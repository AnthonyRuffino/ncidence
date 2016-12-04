/////////////////////
//ENTITY DEFINITION//
/////////////////////
var definition = {
    guid: {
        type: "text",
        size: 254,
        unique: true,
        required: true
    },
    answer: {
        type: "text",
        size: 254,
        unique: false,
        required: true
    },
    expiration_date: {
        type: "date",
        time: true,
        required: true
    },
    is_used: {
        type: "boolean",
        defaultValue: false,
        required: true
    }
}


/////////////
//EXPORTS////
/////////////
try {
    exports.Entity = {
        name: 'captcha',
        definition: definition,
        helpers: null,
        hasOne: null,
        hasMany: null,
        extendsTo: null,
        defaultData: null
    };
}
catch (err) {
    console.log('Error exporting entity [captcha]. Error: ' + err);
}
