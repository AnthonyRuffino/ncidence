"use strict";

class UserService {
    constructor(ormHelper) {
        
        var sesAccessKeyId = process.env.SES_ACCESS_KEY_ID || null;
        var sesSecretAccessKey = process.env.SES_SECRET_ACCESS_KEY || null;
        var sesRegion = process.env.SES_REGION || 'us-east-1';
        
        
        this.ormHelper = ormHelper;
        this.bcrypt = require('bcrypt-nodejs');
        this.guid = require(global.__base + 'utils/guid.js');
        this.transport = require('nodemailer').createTransport({
            transport: 'ses', // loads nodemailer-ses-transport
            accessKeyId: sesAccessKeyId,
            secretAccessKey: sesSecretAccessKey,
            region: sesRegion
        });
        
        var template = require(global.__base + 'utils/htmlTemplates/signupTemplate.js');
        this.templateTranport = this.transport.templateSender({
            subject: 'Confirm account at {{serviceName}}',
            text: template.text,
            html: template.html
        }, {
            from: 'noreply@ncidence.org',
        });
        
        
    }
    
    validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }
    
    getInvalidInpuitMessage(email, password, password2) {
        var invalidInputMessage = null;
        if(email === undefined || email == null || email.length < 1){
            invalidInputMessage = 'email required';
        } else if(!this.validateEmail(email)){
            invalidInputMessage = 'invalid email';
        }else if(password === undefined || password === null || password .length < 1){
            invalidInputMessage = 'password required';
        }else if(password !== password2){
            invalidInputMessage = 'passwords do not match';
        }
        return invalidInputMessage;
    }
    
    


    createUser(req, res) {

        var ormHelper = this.ormHelper;

        var userModel = ormHelper.getMap()['user'].model;
        var email = req.query.email !== undefined && req.query.email !== null ? req.query.email.toLowerCase() : null;
        var password = req.query.password;
        var password2 = req.query.password2;
        var bcrypt = this.bcrypt;
        var guid = this.guid;
        var transport = this.transport;
        var templateTranport = this.templateTranport;


        var finalCallBack = function(err, info, user) {
            if (err) {
                res.json(200, {
                    err: 'issue sending the verification token: ' + err
                });
            }
            else {
                res.json(200, {
                    id: user.id
                });
            }
        }

        var createTokenCallback = function(err, user, tokenVal) {
            if (err) {
                res.json(500, {
                    err: 'issue creating verification token: ' + err
                });
            }
            else {
                templateTranport({
                    to: user.email
                }, {
                    userName: user.email,
                    serviceName: 'ncidence.org',
                    confirmLink: 'https://' + req.headers.host + '/confirm?token=' + tokenVal
                }, function(err, info){
                    finalCallBack(err, info, user);
                });
            }
        }

        var findUserPostCreationCallback = function(err, users, email) {
            if (err) throw err;

            if (users.length < 1 || users[0] === undefined || users[0] === null) {
                res.json(500, {
                    err: 'unable to locate user created with email address:' + email
                });
            }
            else {
                var tokenVal = guid.generate(true, 2);
                var tokenModel = ormHelper.getMap()['token'].model;
                tokenModel.create({
                    val: tokenVal,
                    expriration_date: new Date(),
                    type: 'Signup',
                    client: 'Browser',
                    user: users[0]
                }, function(err) {
                    createTokenCallback(err, users[0], tokenVal);
                });
            }
        }

        var createUserCallback = function(err) {
            if (err) {
                res.json(500, {
                    err: 'unable to create.' + err
                });
            }
            else {
                userModel.find({
                    email: email
                }, function(err, users) {
                    findUserPostCreationCallback(err, users, email);
                });
            }
        }

        var emailLookupPreCreateCallback = function(err, exists, email, roles) {
            if (err) {
                res.json(500, {
                    err: 'unable to create.' + err
                });
            }
            else if (exists) {
                res.json(500, {
                    err: 'Email already in use.'
                });
            }
            else {
                var userData = {
                    email: email,
                    password: bcrypt.hashSync(password, bcrypt.genSaltSync(8), null),
                    status: "User",
                    signup_time: new Date(),
                    role: roles[0]
                }

                userModel.create(userData, function(err) {
                    createUserCallback(err);
                });
            }
        }

        var findRoleCallback = function(err, roles) {
            if (err) throw err;

            if (roles.length < 1 || roles[0] === null) {
                res.json(500, {
                    err: 'unable to locate role:' + 1
                });
            }
            else {
                userModel.exists({
                    email: email
                }, function(err, exists) {
                    emailLookupPreCreateCallback(err, exists, email, roles);
                });
            }
        }
        
        var invlaidInputMessage = this.getInvalidInpuitMessage(email, password, password2);
        if(invlaidInputMessage !== undefined && invlaidInputMessage !== null){
            res.json(500, {
                err: invlaidInputMessage
            });
        }else{
            ormHelper.getMap()['role'].model.find({
                id: 1
            }, function(err, roles) {
                findRoleCallback(err, roles);
            });
        }
    }


    login(req, res) {

        var ormHelper = ormHelper;
        var email = req.query.email;
        var password = req.query.password;
        var bcrypt = this.bcrypt;

        var invalidMessage = 'username or password not valid';

        var userModel = ormHelper.getMap()['user'].model;
        userModel.find({
            email: email
        }, function(err, users) {
            if (err) throw err;

            if (users.length < 1 || users[0] === undefined || users[0] === null) {
                res.json(500, {
                    err: invalidMessage
                });
            }
            else {
                var authenticated = bcrypt.compareSync(password, users[0].password);
                if (authenticated) {
                    res.json(200, {
                        id: users[0].id
                    });
                }
                else {
                    res.json(200, {
                        err: invalidMessage
                    });
                }
            }
        });
    }
}

try {
    exports.UserService = UserService;
}
catch (err) {

}
