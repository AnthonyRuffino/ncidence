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
        
        let template = require(global.__rootdir + 'utils/htmlTemplates/signupTemplate.js');
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
        };

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
                    expriration_date: global.now(),
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
                    signup_time: global.now(),
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
                }else if((new Date(global.now())) > new Date(captchas[0].expiration_date)){
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
        return {id: user.id, username: user.username };
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
    
    getUserByUsername(username, callback) {
        let ormHelper = this.ormHelper;
        let userModel = ormHelper.getMap()['user'].model;
            
        userModel.find({
            username: username
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
    
    login(username, password, callback) {
        if(username === undefined || username === null || username.length < 1){
            callback('username is required');
        }else if(password === undefined || password === null || password.length < 1){
            callback('password is required');
        }else{
            let ormHelper = this.ormHelper;
            let bcrypt = this.bcrypt;
            let invalidMessage = 'username or password not valid';
            let userModel = ormHelper.getMap()['user'].model;
            
            userModel.find({
                username: username
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













//
// const QUERY_ROWS_LIMIT = 10000;
// router.get('/api/roles', function(req, res) {
//
//     let query = {};
//     let options = {};
//     let limit = null;
//     let order = [];
//     let isIdSearch = false;
//
//     let role = ormHelper.getMap()['role'];
//     let entity = role.entity;
//     let definition = entity.definition;
//     let model = role.model;
//
//     Object.keys(req.query).forEach(function(key) {
//         if (key === '_limit') {
//             limit = Number(req.query[key]);
//         }
//         else if (key === '_asc') {
//             if (definition.hasOwnProperty(req.query[key])) {
//                 order = req.query[key];
//             }
//         }
//         else if (key === '_desc') {
//             if (definition.hasOwnProperty(req.query[key])) {
//                 order.push(req.query[key]);
//                 order.push("Z");
//             }
//         }
//         else if (key === '_offset') {
//             let offset = Number(req.query[key]);
//             if (offset != null && !isNaN(offset))
//                 options.offset = offset;
//         }
//         else if (definition.hasOwnProperty(key)) {
//             if (key === 'id')
//                 isIdSearch = true;
//             query[key] = req.query[key];
//         }
//         else if (key.startsWith("__") && key.length > 2 && key !== '__proto__') {
//             /*
//             let fieldName = key.substr(2);
//
//             if (entity.hasOne !== undefined && entity.hasOne !== null && entity.hasOne.length > 0) {
//                       entity.hasOne.forEach(function(owner) {
//
//                       });
//                   }
//                   */
//         }
//     });
//
//
//     if (limit === null || isNaN(limit) || limit > QUERY_ROWS_LIMIT) {
//         limit = QUERY_ROWS_LIMIT;
//     }
//
//     model.find(query, options, limit, order,
//         function(err, rows) {
//             if (err) {
//                 res.json(500, {
//                     err: err
//                 });
//             }
//             else if (rows !== undefined && rows !== undefined && rows.length > 0) {
//                 if (isIdSearch) {
//                     rows[0].getUsers(function(err, users) {
//                         rows[0].users = users;
//                         let resObj = {
//                             data: rows
//                         };
//                         if (err) resObj.errorGettingUsers = err;
//                         res.json(200, resObj);
//                     });
//                 }
//                 else {
//                     res.json(200, {
//                         data: rows
//                     });
//                 }
//
//
//             }
//             else {
//                 res.json(200, {
//                     data: []
//                 });
//             }
//         });
// });
//
//
// router.get('/u/:name/:file', function(req, res) {
//     let name = req.params.name;
//     let file = req.params.file;
//
//     ormHelper.getMap()['user'].model.find({ username: name }, function(err, users) {
//         if (err || users === undefined || users == null || users.length < 1 || users[0] === undefined || users[0] === null) {
//
//             console.log('test param: ', req.query.ex !== undefined);
//             if (req.query.ex !== undefined) {
//                 let code = '((ctx) => { console.log("testValue: ", ctx.testValue); ctx.res.writeHead(200, {"Content-Type": "text/html"}); ctx.res.end("<h1>LOLZ - "+ctx.testValue+"</h1>"); })(ctx);';
//                 let your_code = new Function(['ctx'].join(','), code);
//
//                 try {
//                     your_code({ req, res, testValue: 'trster' });
//                 }
//                 catch (executionException) {
//                     res.writeHead(200, {
//                         'Content-Type': 'text/html'
//                     });
//                     res.end('<h1>Error executing lambda expression: ' + executionException + '</h2>');
//                 }
//
//             }
//             else {
//                 res.writeHead(200, {
//                     'Content-Type': 'text/html'
//                 });
//                 res.end('<h1>Error finding content for user: ' + name + '</h1><br/><h2>Err:' + (err || 'no such user') + '</h2>');
//             }
//
//         }
//         else {
//             ormHelper.getMap()['file'].model.find({ user_id: users[0].id, name: file }, function(err, files) {
//                 if (err || files === undefined || files == null || files.length < 1 || files[0] === undefined || files[0] === null) {
//                     res.writeHead(200, {
//                         'Content-Type': 'text/html'
//                     });
//                     res.end('<h1>Error finding file for user: ' + name + '. ile: ' + file + '</h1><br/><h2>Err :' + (err || 'no such file') + '</h2>');
//                 }
//                 else {
//                     if (files[0].content_type === 'lambda') {
//                         let code = '((req, res) => { ' + files[0].content + ' })(req, res);';
//                         let your_code = new Function(['req', 'res'].join(','), code);
//                         your_code(req, res);
//                     }
//                     else {
//                         res.writeHead(200, {
//                             'Content-Type': files[0].content_type
//                         });
//                         res.end(files[0].content);
//                     }
//                 }
//             });
//         }
//     });
//
// });
//
//
//
// const CAPTCHA_EXP_IN_MINUTES = 5;
// router.get('/api/captcha', function(req, res) {
//
//     let number = parseInt(Math.random() * 900000 + 100000);
//     let captchaId = uuidv4().substring(0, 4);
//     let expDate = new Date((new Date()).getTime() + CAPTCHA_EXP_IN_MINUTES * 60000);
//













//     let captchaModel = ormHelper.getMap()['captcha'].model;
//
//     captchaModel.create({ guid: captchaId, answer: number + '', expiration_date: expDate }, function(err) {
//         if (err) {
//             res.json(500, {
//                 err: 'Error creating CAPTCHA: ' + err
//             });
//         }
//         else {
//             let p = new captchapng(80, 30, number); // width,height,numeric captcha
//             p.color(0, 0, 0, 0); // First color: background (red, green, blue, alpha)
//             p.color(80, 80, 80, 255); // Second color: paint (red, green, blue, alpha)
//
//             let img = p.getBase64();
//             let imgbase64 = new Buffer(img, 'base64');
//             res.writeHead(200, {
//                 'Content-Type': 'image/png',
//                 'captcha-id': captchaId
//             });
//             res.end(imgbase64);
//         }
//
//     });
//
// });





module.exports = function(ormHelper) {
    return new UserService(ormHelper);
};
