/* jshint node:true */ /* global define, escape, unescape */
"use strict";

class JwtHelper {
	constructor(domain, secretOrKey, expiresIn) {
		this.domain = domain;
		this.passport = require('passport');
		this.jwt = require('jsonwebtoken');
		this.passportJWT = require("passport-jwt");
		this.ExtractJwt = this.passportJWT.ExtractJwt;
		this.JwtStrategy = this.passportJWT.Strategy;

		this.jwtOptions = {}
		this.jwtOptions.jwtFromRequest = this.ExtractJwt.fromAuthHeaderWithScheme("jwt");
		this.jwtOptions.secretOrKey = secretOrKey;
		this.jwtOptions.expiresIn = expiresIn;
		this.jwtOptions.passReqToCallback = true;

		this.cookieMaxAge = (expiresIn * 1000) * 10;
		this.jwtTokenKey = 'jwt-token';
		this.logoutUrl = '/logout';
	}




	setJwtCookie(res, token) {
		res.cookie(this.jwtTokenKey, token, { maxAge: this.cookieMaxAge, httpOnly: true, domain: this.domain });
	}

	clearJwtCookie(res) {
		res.cookie(this.jwtTokenKey, 'expired', { maxAge: 1, httpOnly: true, domain: this.domain });
	}

	getTokenFromCookies(cookies) {
		return cookies[this.jwtTokenKey];
	}

	verifyToken(token) {
		try {
			return this.jwt.verify(token, this.jwtOptions.secretOrKey);
		}
		catch (err) {
			console.log('JWT verify exception: ' + err.message);
		}
	}
	
	authRequired() {
		return this.passport.authenticate('jwt', { session: false });
	}

	init(router, userService, socketIOHelper, urlencodedParser) {
		var jwtHeaderFromCookie = (req, res, next) => {
	
			if(req.url === this.logoutUrl) {
				this.clearJwtCookie(res);
				next();
				return;
			}
			
			var token = this.getTokenFromCookies(req.cookies);
			if (token !== undefined && token !== null) {
				let payload = this.verifyToken(token);
				if (payload) {
					const user = { id: payload.id, username: payload.username };
					const newToken = this.jwt.sign(user, this.jwtOptions.secretOrKey, { expiresIn: this.jwtOptions.expiresIn });
					console.log('jwtHeaderFromCookie', req.url);
					this.setJwtCookie(res, newToken);
					req.headers['authorization'] = 'JWT ' + newToken;
					req.user = user
				}
				else {
					//this.clearJwtCookie(res);
				}
			}
			next();
		};


		router.use(jwtHeaderFromCookie);


		var strategy = new this.JwtStrategy(this.jwtOptions, (req, jwt_payload, next) => {
			userService.getUserById(jwt_payload.id, (user) => {
				if (user) {
					next(null, user);
				}
				else {
					next(null, false);
				}
			});
		});
		router.use(this.passport.initialize());
		this.passport.use(strategy);


		//logout
		router.get(this.logoutUrl, (req, res) => {
			socketIOHelper.logoutUser(req.cookies.ncidence);
			this.clearJwtCookie(res);
			res.redirect('/');
		});

		//login
		router.post("/auth", urlencodedParser, (req, res) => {
			userService.login2(req.body.username, req.body.password, (err, user) => {
				if (err) {
					res.status(401).json({ message: "passwords did not match" });
					return;
				}
				if (!user) {
					res.status(401).json({ message: "passwords did not match" });
					return;
				}
				
				console.log('/auth', req.cookies);

				var token = this.jwt.sign(user, this.jwtOptions.secretOrKey, { expiresIn: this.jwtOptions.expiresIn });
				socketIOHelper.loginUser(req.cookies.ncidence, user, token);
				this.setJwtCookie(res, token);
				res.redirect('/');
			});
		});
	}
}

try {
	exports.JwtHelper = JwtHelper;
}
catch (err) {

}