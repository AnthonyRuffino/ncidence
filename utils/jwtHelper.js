/* jshint node:true */ /* global define, escape, unescape */
"use strict";

class JwtHelper {
	constructor({
		domain,
		secretOrKey,
		expiresIn,
		jwtTokenKey,
		loginUrl,
		logoutUrl,
		supportGetLogout,
		authFormUserNameField,
		authFormPasswordField,
		logoutRedirect,
		loginRedirect,
		loginFailureMessage,
		unathorizedCode

	}) {
		this.passport = require('passport');
		this.jwt = require('jsonwebtoken');
		this.passportJWT = require("passport-jwt");
		this.ExtractJwt = this.passportJWT.ExtractJwt;
		this.JwtStrategy = this.passportJWT.Strategy;

		this.domain = domain;
		this.jwtOptions = {}
		this.jwtOptions.jwtFromRequest = this.ExtractJwt.fromAuthHeaderWithScheme("jwt");
		this.jwtOptions.secretOrKey = secretOrKey;
		this.jwtOptions.expiresIn = expiresIn;
		this.jwtOptions.passReqToCallback = true;

		this.cookieMaxAge = (expiresIn * 1000);
		this.jwtTokenKey = jwtTokenKey || 'jwt-token';
		this.loginUrl = loginUrl || '/auth';
		this.logoutUrl = logoutUrl || '/logout';
		this.supportGetLogout = supportGetLogout || true;
		this.authFormUserNameField = authFormUserNameField || 'username';
		this.authFormUserNameField = authFormPasswordField || 'password';
		this.logoutRedirect = logoutRedirect || '/';
		this.loginRedirect = loginRedirect || '/';
		this.loginFailureMessage = 'Username or password is incorrect';
		this.unathorizedCode = unathorizedCode || 401;
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
			console.log('JwtHelper - JWT verify exception: ' + err.message);
		}
	}

	authRequired() {
		return this.passport.authenticate('jwt', { session: false });
	}

	init({ router, userService, urlencodedParser, loginLogoutHooks }) {
		
		if(!userService || !userService.getUserById || typeof userService.getUserById !== 'function') {
			throw 'a userService object with method called "getUserById" was not provided';
		}
		
		if(!userService || !userService.mapUserForJwtToken || typeof userService.mapUserForJwtToken !== 'function') {
			throw 'a userService object with method called "mapUserForJwtToken" was not provided';
		}
		
		if(!userService || !userService.login || typeof userService.login !== 'function') {
			throw 'a userService object with method called "login" was not provided';
		}
		
		if(!urlencodedParser) {
			throw 'a urlencodedParser object must be provided. e.g. require("body-parser").urlencoded({ extended: false });';
		}
		
		
		//this middleware continually recreates a new jwt token if the current one is valid.
		router.use((req, res, next) => {
			if (req.url === this.logoutUrl) {
				this.clearJwtCookie(res);
				next();
				return;
			}
			var token = this.getTokenFromCookies(req.cookies);
			if (token !== undefined && token !== null) {
				let payload = this.verifyToken(token);
				if (payload) {
					const user = userService.mapUserForJwtToken(payload);
					const newToken = this.jwt.sign(user, this.jwtOptions.secretOrKey, { expiresIn: this.jwtOptions.expiresIn });
					this.setJwtCookie(res, newToken);
					req.headers['authorization'] = 'JWT ' + newToken;
					req.user = user
				}
			}
			next();
		});


		//passport configuration
		router.use(this.passport.initialize());
		this.passport.use(new this.JwtStrategy(this.jwtOptions, (req, jwt_payload, next) => {
			userService.getUserById(jwt_payload.id, (user) => {
				if (user) {
					next(null, userService.mapUserForJwtToken(user));
				}
				else {
					next(null, false);
				}
			});
		}));


		//logout
		const logout = (req, res) => {
			if(loginLogoutHooks && loginLogoutHooks.logoutUserHook && typeof loginLogoutHooks.logoutUserHook === 'function') {
				loginLogoutHooks.logoutUserHook(req);
			}
			this.clearJwtCookie(res);
			res.redirect(this.logoutRedirect);
		}
		if(this.supportGetLogout) {
			router.get(this.logoutUrl, (req, res) => {
				logout(req, res);
			});
		}
		router.post(this.logoutUrl, (req, res) => {
			logout(req, res);
		});
		

		//login
		router.post(this.loginUrl, urlencodedParser, (req, res) => {
			userService.login(req.body.username, req.body.password, (err, user) => {
				if (err) {
					res.status(this.unathorizedCode).json({ message: this.loginFailureMessage });
					return;
				}
				if (!user) {
					res.status(this.unathorizedCode).json({ message: this.loginFailureMessage });
					return;
				}
				
				var token = this.jwt.sign(userService.mapUserForJwtToken(user), this.jwtOptions.secretOrKey, { expiresIn: this.jwtOptions.expiresIn });
				if(loginLogoutHooks && loginLogoutHooks.loginUserHook && typeof loginLogoutHooks.loginUserHook === 'function') {
					loginLogoutHooks.loginUserHook(req, user, token);
				}
				this.setJwtCookie(res, token);
				res.redirect(this.loginRedirect);
			});
		});
	}
}

exports.JwtHelper = JwtHelper;