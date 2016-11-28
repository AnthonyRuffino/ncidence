/////////////////////
//ENTITY DEFINITION//
/////////////////////
var orm = require("orm");
var definition = {
    username: {
        type: "text",
        size: 20,
        unique: true,
        required: true
    }
    /*
    ,
    password: {
        type: "text",
        size: 254,
        required: true
    },
    salt: {
        type: "text",
        size: 254,
        required: true
    },
    email: {
        type: "text",
        size: 254,
        unique: true,
        required: true
    },
    is_locked: {
        type: "boolean",
        defaultValue: false,
        required: true
    },
    login_attempts_since_last_success: {
        type: "integer",
        size: 2,
        defaultValue: 0,
        required: true
    },
    last_login_time: {
        type: "date",
        time: true
    },
    status: {
        type: "enum",
        values: ["User", "Rep", "Admin"],
        required: true
    },
    signup_time: {
        type: "date",
        time: true,
        required: true
    },
    lock_date: {
        type: "date",
        time: true,
        required: false
    }
    */
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
var hasOne = [];
hasOne.push({
    name: 'role',
    options: {
        required: true,
        reverse: 'users'
    }
});


////////////////////////////
//HAS MANY ASSOCIATIONS/////
////////////////////////////
var hasMany = [];
hasMany.push({
    name: 'role',
    desc: 'role',
    options: {
        reverse: 'users',
        key: true,
        accessor: 'Roles'
    },
    meta: {
        why: String,
        num: {
            type: 'integer',
            size: 2,
            defaultValue: 0
        }
    }
});


////////////////////////////
//EXTENDS TO  ASSOCIATIONS//
////////////////////////////
var extendsTo = [];
extendsTo.push({
    name: 'address',
    data: {
        street: String,
        number: Number
    }
});


//////////////////////
//DEFAULT DATA////////
//////////////////////
var defaultData = [];
defaultData.push({
    id: 1,
    username: 'user1',
    role_id: 1
});
defaultData.push({
    id: 2,
    username: 'user2',
    role_id: 1
});


/////////////
//EXPORTS////
/////////////
try {
    exports.Entity = {
        name: 'user',
        definition: definition,
        helpers: helpers,
        hasOne: hasOne,
        hasMany: null,
        extendsTo: extendsTo,
        defaultData
    };
}
catch (err) {
    console.log('Error exporting entity [role]. Error: ' + err);
}
