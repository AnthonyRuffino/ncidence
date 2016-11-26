/* jshint node:true *//* global define, escape, unescape */
'use strict';

var Guid = {};
Guid.defaultMaxS4Blocks = 8;

var s4 = function () {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
};

var isTrue = function(input) {
    if(input !== undefined && input != null && (input === true || input.toLowerCase() == "true")){
        return true;
    }
    return false;
};

var getS4NumberOfS4Blocks = function(input) {
    if(input !== undefined && input != null && input > 0 && input <= Guid.defaultMaxS4Blocks){
        return input;
    }
    return Guid.defaultMaxS4Blocks;
};


Guid.guid = function(useDashes, blocks) {
    
    var dash = '';
    
    if(isTrue(useDashes)){
        dash = '-';
    }
    
    blocks = getS4NumberOfS4Blocks(blocks);
    
    
    var guid = s4();
    
    if(blocks == 2){
        guid = guid + dash;
    }
    
    for(var i=2;i<=blocks;i++){
        
        if(i >= 3 && i <= 6){
            guid = guid + dash + s4();
        }else{
            guid = guid + s4();
        }
        
    }
    
    return guid;
};


try {
    exports.generate = Guid.guid;
}
catch(err) {
    
}