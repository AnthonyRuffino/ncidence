'use strict'

module.exports = function(cookieName, maxAge) {
    let setHostCookie = (req, res, next) => {
      let cookieValue = req.cookies[cookieName];
      if (cookieValue === undefined || cookieValue === null) {
        cookieValue = require('uuid/v4')();
      }
      res.cookie(cookieName, cookieValue, { maxAge: maxAge, httpOnly: true, domain: '.' + global.__host });
      next();
    };
    return setHostCookie;
}



