"use strict";

class UserService {
    constructor(ormHelper) {
        
        let sesAccessKeyId = process.env.SES_ACCESS_KEY_ID || null;
        let sesSecretAccessKey = process.env.SES_SECRET_ACCESS_KEY || null;
        let sesRegion = process.env.SES_REGION || 'us-east-1';
        
        
        this.ormHelper = ormHelper;
        this.bcrypt = require('bcrypt-nodejs');
        this.uuidv4 = require('uuid/v4');
        this.transport = require('nodemailer').createTransport({
            transport: 'ses', // loads nodemailer-ses-transport
            accessKeyId: sesAccessKeyId,
            secretAccessKey: sesSecretAccessKey,
            region: sesRegion
        });
        
        let template = require(global.__base + 'utils/htmlTemplates/signupTemplate.js');
        this.templateTranport = this.transport.templateSender({
            subject: 'Confirm account at {{serviceName}}',
            text: template.text,
            html: template.html
        }, {
            from: 'noreply@ncidence.org',
        });
        
        
    }
    
    validateEmail(email) {
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }
    
    getInvalidInputMessage(email, password, password2, captchaAnswer, captchaId) {
        let invalidInputMessage = null;
        if(email === undefined || email == null || email.length < 1){
            invalidInputMessage = 'email required';
        }else if(!this.validateEmail(email)){
            invalidInputMessage = 'invalid email';
        }else if(password === undefined || password === null || password.length < 1){
            invalidInputMessage = 'password required';
        }else if(password !== password2){
            invalidInputMessage = 'passwords do not match';
        }else if(captchaAnswer === undefined || captchaAnswer === null || captchaAnswer.length < 1){
            invalidInputMessage = 'captcha answer required';
        }else if(captchaId === undefined || captchaId === null || captchaId.length < 1){
            invalidInputMessage = 'captchaId required';
        }
        return invalidInputMessage;
    }
    
    


    createUser(req, res) {

        let ormHelper = this.ormHelper;

        let userModel = ormHelper.getMap()['user'].model;
        let email = req.query.email !== undefined && req.query.email !== null ? req.query.email.toLowerCase() : null;
        let password = req.query.password;
        let password2 = req.query.password2;
        let captchaAnswer = req.query.captchaAnswer;
        let captchaId = req.query.captchaId;
        let bcrypt = this.bcrypt;
        let uuidv4 = this.uuidv4;
        let templateTranport = this.templateTranport;


        let finalCallBack = function(err, info, user) {
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

        let createTokenCallback = function(err, user, tokenVal) {
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
        };

        let findUserPostCreationCallback = function(err, users, email) {
            if (err) throw err;

            if (users.length < 1 || users[0] === undefined || users[0] === null) {
                res.json(500, {
                    err: 'unable to locate user created with email address:' + email
                });
            }
            else {
                let tokenVal = uuidv4().substring(0, 13);
                let tokenModel = ormHelper.getMap()['token'].model;
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
        };

        let createUserCallback = function(err) {
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
        };

        let emailLookupPreCreateCallback = function(err, exists, email, roles) {
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
                let userData = {
                    email: email,
                    password: bcrypt.hashSync(password, bcrypt.genSaltSync(8), null),
                    status: "User",
                    signup_time: new Date(),
                    role: roles[0]
                };

                userModel.create(userData, function(err) {
                    createUserCallback(err);
                });
            }
        };

        let findRoleCallback = function(err, roles) {
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
        };
        
        let findCaptchaCallback = function(err, captchas) {
            if (err) throw err;

            if (captchas.length < 1 || captchas[0] === null) {
                res.json(500, {
                    err: 'unable to locate captchaId:' + captchaId
                });
            }
            else {
                
                let captchaIsInvalidValidMessage = null;
                let captchaNeedsUpdate = true;
                if(captchas[0].is_used === true){
                    captchaIsInvalidValidMessage = 'captcha has already been used';
                    captchaNeedsUpdate = false;
                }else if(captchas[0].answer !== captchaAnswer){
                    captchaIsInvalidValidMessage = 'captcha incorrect';
                }else if((new Date()) > captchas[0].expiration_date){
                    captchaIsInvalidValidMessage = 'captcha expired';
                }
                
                captchas[0].is_used = true;
                
                if(captchaIsInvalidValidMessage !== null){
                    if(captchaNeedsUpdate){
                        captchas[0].save(function(err){
                            if(err)
                                console.log('error marking captcha as used: ' + err);
                            
                            res.json(500, {
                                err: captchaIsInvalidValidMessage
                            });
                        });
                    }else{
                        res.json(500, {
                            err: captchaIsInvalidValidMessage
                        });
                    }
                }else{
                    captchas[0].save(function(err){
                        if(err)
                            console.log('error marking captcha as used: ' + err);
                        
                        ormHelper.getMap()['role'].model.find({
                            id: 1
                        }, function(err, roles) {
                            findRoleCallback(err, roles);
                        });
                    });
                }
            }
        };
        
        let invlaidInputMessage = this.getInvalidInputMessage(email, password, password2, captchaAnswer, captchaId);
        if(invlaidInputMessage !== undefined && invlaidInputMessage !== null){
            res.json(500, {
                err: invlaidInputMessage
            });
        }else{
            ormHelper.getMap()['captcha'].model.find({ guid: captchaId }, function(err, captchas) {
                findCaptchaCallback(err, captchas);
            });
        }
    }
    
    mapUserForJwtToken(user) {
        return {id: user.id, username: user.email };
    }
    
    getUserById(id, callback) {
        let ormHelper = this.ormHelper;
        let userModel = ormHelper.getMap()['user'].model;
            
        userModel.find({
            id: id
        }, (err, users) => {
            if (err) throw err;

            if (users.length < 1 || users[0] === undefined || users[0] === null) {
                callback(null);
            }
            else {
                callback(this.mapUserForJwtToken(users[0]));
            }
        });
    }
    
    login(email, password, callback) {
        if(email === undefined || email === null || email.length < 1){
            callback('email is required');
        }else if(password === undefined || password === null || password.length < 1){
            callback('password is required');
        }else{
            let ormHelper = this.ormHelper;
            let bcrypt = this.bcrypt;
            let invalidMessage = 'username or password not valid';
            let userModel = ormHelper.getMap()['user'].model;
            
            userModel.find({
                email: email
            }, (err, users) => {
                if (err) throw err;
    
                if (users.length < 1 || users[0] === undefined || users[0] === null) {
                    callback(invalidMessage + '!');
                }
                else {
                    let authenticated = bcrypt.compareSync(password, users[0].password);
                    if (authenticated) {
                        callback(null, users[0] );
                    }
                    else {
                        callback(invalidMessage );
                    }
                }
            });
        }
    }
}

module.exports = function(ormHelper) {
    return new UserService(ormHelper);
};
