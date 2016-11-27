/* jshint node:true *//* global define, escape, unescape */
"use strict";

class FauxIndexHtml {
  constructor(publicdir) {
	  this.publicdir = publicdir;
	  this.fs = require('fs');
  }
  
  process(req, res, next) {
	    if (req.path.indexOf('.') === -1) {
	    	
	    	var fs = this.fs;
	    	var publicdir = this.publicdir;
	    	
	    	var dir = publicdir + req.path;
	    	fs.exists(dir, function(dirExists) {
	    		if(dirExists){
	        	    var indexTypeFile = dir.substring(dir.substring(0,dir.length-1).lastIndexOf("/")+1,dir.substring(0,dir.length).lastIndexOf("/")) + '.html';
	        	    fs.exists(dir + indexTypeFile, function(dirHtmlFileExists) {
	        	    	if(dirHtmlFileExists)
	            	    	req.url += indexTypeFile;
	        	    	next();
	        	    });
	    		}else{
	    	        var file = publicdir + req.path + '.html';
	    	        fs.exists(file, function(htmlFileExists) {
	    	          if (htmlFileExists)
	    	            req.url += '.html';
	    	          next();
	    	        });
	    		}
	    		
	    	});
	    }
	    else{
	    	if(req.path.endsWith('.html')){
	    		var newPath = req.path.substring(0, req.path.lastIndexOf('.html'));
	    		res.redirect(newPath);
	    	}else{
	    		next(); 
	    	}
	    }
	}
}

try {
    exports.FauxIndexHtml = FauxIndexHtml;
}
catch(err) {
    
}