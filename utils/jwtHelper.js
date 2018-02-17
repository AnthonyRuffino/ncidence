/* jshint node:true */ /* global define, escape, unescape */
"use strict";

class JwtHelper {
	constructor(secretOrKey, expiresIn) {
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
	}




	setJwtCookie(res, token) {
		res.cookie(this.jwtTokenKey, token, { maxAge: this.cookieMaxAge, httpOnly: true });
	}

	clearJwtCookie(res) {
		res.clearCookie(this.jwtTokenKey);
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
			var token = this.getTokenFromCookies(req.cookies);
			if (token !== undefined && token !== null) {
				let payload = this.verifyToken(token);
				if (payload) {
					const user = { id: payload.id, username: payload.username };
					const newToken = this.jwt.sign(user, this.jwtOptions.secretOrKey, { expiresIn: this.jwtOptions.expiresIn });
					this.setJwtCookie(res, newToken);
					req.headers['authorization'] = 'JWT ' + newToken;
					req.user = user
				}
				else {
					this.clearJwtCookie(res);
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


		router.get("/logout", (req, res) => {

			var token = this.getTokenFromCookies(req.cookies);
			var user = this.verifyToken(token);

			if (user) {
				//socketIOHelper.logoutUser(user.username);
				socketIOHelper.logoutUser(req.cookies.io);
			}

			this.clearJwtCookie(res);
			res.redirect('/');
		});

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

				var token = this.jwt.sign(user, this.jwtOptions.secretOrKey, { expiresIn: this.jwtOptions.expiresIn });
				socketIOHelper.loginUser(req.cookies.io, user, token);
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