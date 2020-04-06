const express = require('express');
const mongoose = require('mongoose');
const validation = require('./../libs/paramsValidationLib');
const response = require('./../libs/responseLib');
const check = require('./../libs/checkLib');
const tokenLib = require('./../libs/tokenLib');
const emailLib = require('./../libs/emailLib');
const password = require('./../libs/generatePasswordLib');
const shortid = require('shortid');
const logger = require('pino')();

let userModel = mongoose.model('UserModel');
let authModel = mongoose.model('AuthModel');

// let getAllUser = (req, res) => {
//     logger.info(req.user);
//     userModel.find()
//         .select(' -__v -_id')
//         .lean()
//         .exec((err, result) => {
//             if (err) {
//                 console.log(err)
//                 logger.error(err.message, 'User Controller: getAllUser', 10)
//                 let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
//                 res.send(apiResponse)
//             } else if (check.isEmpty(result)) {
//                 logger.info('No User Found', 'User Controller: getAllUser')
//                 let apiResponse = response.generate(true, 'No User Found', 404, null)
//                 res.send(apiResponse)
//             } else {
//                 let apiResponse = response.generate(false, 'All User Details Found', 200, result)
//                 res.send(apiResponse)
//             }
//         })
// }//get all users

let getAllUser = (req, res) => {
    
    
    const pageValue = parseInt(req.body.pageValue)
    const limit = parseInt(req.body.limit);
    let data = {
        userCount:0,
        users:null
    }

    userModel.find()
        .select(' -__v -_id')
        .skip(pageValue*limit)
        .lean()
        .limit(limit)
        .exec((err, result) => {
            if (err) {
                console.log(err)
                logger.error(err.message, 'User Controller: getAllUser', 10)
                let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'User Controller: getAllUser')
                let apiResponse = response.generate(true, 'No User Found', 404, null)
                res.send(apiResponse)
            } else {
                 
                 data.users = result;
                 userModel.find().countDocuments(function(err,result){
                  data.userCount = result;
                 let apiResponse = response.generate(false, 'All User Details Found', 200,data)
                 res.send(apiResponse)
                 })
                 
            }
        })
}//get all users


let deleteUser = (req, res) => {

    userModel.findOneAndRemove({ 'userId': req.params.userId }).exec((err, result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'User Controller: deleteUser', 10)
            let apiResponse = response.generate(true, 'Failed To delete user', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No User Found', 'User Controller: deleteUser')
            let apiResponse = response.generate(true, 'No User Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Deleted the user successfully', 200, result)
            res.send(apiResponse)
        }
    });// end user model find and remove

}//end delete user


let editUser = (req, res) => {

    let options = req.body;
    userModel.update({ 'userId': req.params.userId }, options).exec((err, result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'User Controller:editUser', 10)
            let apiResponse = response.generate(true, 'Failed To edit user details', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No User Found', 'User Controller: editUser')
            let apiResponse = response.generate(true, 'No User Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'User details edited', 200, result)
            res.send(apiResponse)
        }
    });// end user model update


}// end edit user

let getSingleUser = (req, res) => {
    console.log('get single user function is called');
    userModel.findOne({ 'userId': req.params.id })
        .select('-password -__v -_id')
        .lean()
        .exec((err, result) => {
            if (err) {
                console.log(err)
                logger.error(err.message, 'User Controller: getSingleUser', 10)
                let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'User Controller:getSingleUser')
                let apiResponse = response.generate(true, 'No User Found', 404, null)
                res.send(apiResponse)
            } else {
                let apiResponse = response.generate(false, 'User Details Found', 200, result)
                res.send(apiResponse)
            }
        })
}// end get single user



let signUp = (req, res) => {

    let validateUserInput = (req, res) => {
        return new Promise((resolve, reject) => {
            logger.info('validation is starting');
            if (req.body.email) {
                if (!validation.Email(req.body.email)) {
                    let apiresponse = response.generate(true, 'email does not meet the requirements', 500, null);
                    reject(apiresponse);
                }
                else if (check.isEmpty(req.body.password)) {
                    let apiresponse = response.generate(true, 'password does not meet the requirements', 500, null);
                    reject(apiresponse)
                }
                else {
                    resolve(req);
                }

            } else {
                let apiresponse = response.generate(true, 'one or more parameters are missing', 500, null);
                reject(apiresponse);
            }

        })
    }  //end validate userInput

    let createUser = () => {
        return new Promise((resolve, reject) => {
            userModel.findOne({ email: req.body.email })
                .exec((err, retrivedDetails) => {
                    if (err) {
                        let apiresponse = response.generate(true, 'failed to create user', 500, null);
                        reject(apiresponse);
                    }

                    else {
                        if (check.isEmpty(retrivedDetails)) {
                            logger.info(retrivedDetails + ' no email is there');
                            // console.log('no email is exists');

                            let user = new userModel({
                                userId: shortid.generate(),
                                firstName: req.body.firstName,
                                lastName: req.body.lastName,
                                userName:`${req.body.firstName} ${req.body.lastName}`,
                                email: req.body.email,
                                mobileNumber: req.body.mobileNumber,
                                password: password.hashpassword(req.body.password),
                                createdOn: Date.now()

                            });

                            user.save((err, result) => {
                                if (err) {
                                    let apiresponse = response.generate(true, 'failed to create user', 500, null);
                                    reject(apiresponse);
                                }
                                else {
                                    let newUserObject = user.toObject();
                                    resolve(newUserObject);
                                }

                            });

                        }
                        else {
                            logger.info(retrivedDetails);
                            let apiresponse = response.generate(true, 'A user is already existed with same email id ', 500, null);
                            reject(apiresponse);
                            // console.log('a user is already existed with this email');
                        }
                    }

                })

        })

    }//end user created

    validateUserInput(req, res)
        .then(createUser)
        .then((resolve) => {
            delete resolve.password;
            let apiresponse = response.generate(false, 'user created', 200, resolve);
            res.send(apiresponse);
        }).catch((err) => {
            console.log(err);
            res.send(err);
        })


} //end signup method


let login = (req, res) => {


    let findUser = () => {
        return new Promise((resolve, reject) => {
            if (check.isEmpty(req.body.email))
            {
                let apiresponse = response.generate(true, 'email parameter is missing', 500, null);
                reject(apiresponse);
            }
            else
            {
                userModel.findOne({email:req.body.email},(err,result)=>{
                    if(err)
                    {
                        let apiresponse = response.generate(true, 'failed to user login', 500, null);
                         reject(apiresponse);
                    }
                    else
                    {
                        if(result)
                        {
                            resolve(result);
                        }
                        else
                        {
                            let apiresponse = response.generate(true, 'user with this email is not found', 500, null);
                             reject(apiresponse);

                        }

                    }

                });


            }
        });


  
  
    } //end find user

    let validatePassword = (userDetails) => {
        return new Promise((resolve, reject) => {
            if (check.isEmpty(req.body.password)) {
                let apiresponse = response.generate(true, 'password parameter is missing', 500, null);
                reject(apiresponse);
            }
            else {
                password.comparePassword(req.body.password, userDetails.password, (err, isMatch) => {
                    if (err) {
                        console.log(err)
                        logger.error('userController: validatePassword()');
                        let apiResponse = response.generate(true, 'Login Failed', 500, null)
                        reject(apiResponse)
                    } else if (isMatch) {
                        delete userDetails.password;
                        delete userDetails.createdOn;
                        delete userDetails._id;
                        delete userDetails.__v;
                        //let obj = userDetails.toObject();
                        resolve(userDetails);
                    } else {
                        logger.info('Login Failed Due To Invalid Password');
                        let apiResponse = response.generate(true, 'Wrong Password.Login Failed', 400, null)
                        reject(apiResponse)
                    }
                })
            }
        })


      
        
    } // end validate password

    
    

    let generateToken = (userDetails) => {
        console.log("generate token");
        return new Promise((resolve, reject) => {
            tokenLib.generateToken(userDetails, (err, tokenDetails) => {
                if (err) {
                    console.log(err)
                    let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
                    reject(apiResponse)
                } else {
                    tokenDetails.userId = userDetails.userId
                    tokenDetails.userDetails = userDetails
                    resolve(tokenDetails)
                }
            })
        })
    }//end generate token

    let saveToken = (tokenDetails)=>{
        return new Promise((resolve, reject) => {
            authModel.findOne({ userId: tokenDetails.userId })
                .exec((err, retrivedDetails) => {
                    if (err) {
                        let apiresponse = response.generate(true, 'failed to retrive token details from db', 500, null);
                        reject(apiresponse);
                    }

                    else {
                        if (check.isEmpty(retrivedDetails)) {
                            logger.info(retrivedDetails + ' first login by usserr');
                            // console.log('no email is exists');

                            let auth = new authModel({
                                userId: tokenDetails.userId,
                                authToken:tokenDetails.token,
                                userName:tokenDetails.userDetails.userName,
                                tokenSecret: tokenDetails.tokenSecret
                              });

                            auth.save((err, result) => {
                                if (err) {
                                    let apiresponse = response.generate(true, 'failed to save token', 500, null);
                                    reject(apiresponse);
                                }
                                else {
                                    let authObject = auth.toObject();
                                    delete authObject.tokenSecret;
                                    resolve(authObject);
                                }

                            });

                        }
                        else {
                            logger.info('token details are going to be modified');
                            retrivedDetails.authToken=tokenDetails.token;
                            retrivedDetails.tokenSecret=tokenDetails.tokenSecret;
                            retrivedDetails.tokenGenerationTime=Date.now();
                            retrivedDetails.save((err, result) => {
                                if (err) {
                                    let apiresponse = response.generate(true, 'failed to save token', 500, null);
                                    reject(apiresponse);
                                }
                                else {
                                    let authObject = retrivedDetails.toObject();
                                    delete authObject.tokenSecret;
                                    delete authObject._id;
                                    delete authObject.__v;
                                    resolve(authObject);
                                }

                            });

                        }
                    }

                })

        })

    }//end save token

    findUser(req,res)
    .then(validatePassword)
    .then(generateToken)
    .then(saveToken)
    .then((resolve)=>{
        let apiresponse = response.generate(false, 'login success', 200, resolve);
        logger.info(apiresponse);
        res.status(200);
        res.send(apiresponse);
    }).catch((err)=>
    {
        console.log(err);
        res.send(err);
    });
        


}




// end of the login function 

let logout = (req,res)=>{
    logger.info(req.user);
    authModel.findOneAndRemove({ 'userId': req.user.userId }).exec((err, result) => {
       
        if (err) {
            logger.info(err);           
            let apiResponse = response.generate(true, 'Failed To logout user', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No User Found to logout')
            let apiResponse = response.generate(true, 'user already logout ', 404, null)
            res.send(apiResponse)
        } else {
            logger.info('logout user successfully');
            let apiResponse = response.generate(false, 'logout user successfully', 200, result)
            res.send(apiResponse)
        }
    });// end user model find and remove

}


let resetPasswordFunction=(req,res)=>{

    let checkUserEmail=()=>{
        console.log('while checkUserMail',req.body.email);
        return new Promise((resolve,reject)=>{
            if(!check.isEmpty(req.body.email)){
                
                userModel.findOne({'email':req.body.email},(err,result)=>{
                    if(err){
                        logger.error('some error occured while resetting password');
                        let apiResponse=response.generate(true,'error occured',500,null)
                        reject(apiResponse);
                    }
                    else if(check.isEmpty(result)){
                        logger.error('user not found while resetting password');
                        let apiResponse=response.generate(true,'email Id is not valid',404,null)
                        reject(apiResponse);
                    }
                    else{
                    logger.info(result);
                    resolve(result);
                    }
                })
            }
            else{
                let apiResponse=response.generate(true,'email is empty',500,null);
                resolve(apiResponse);
            }
        })
    }

let resetPassword=(userDetail)=>{
    return new Promise((resolve,reject)=>{
        let recovery={
            recoveryPassword:shortid.generate()
        }

        userModel.findOneAndUpdate({'userId':userDetail.userId},recovery,(err,result)=>{
            if(err){
                logger.error('some error occured while setting recovery password');
                let apiResponse=response.generate(true,'error occured',500,null)
                reject(apiResponse);
            }
            else if(check.isEmpty(result)){
                logger.error('detail not found while setting recovery password');
                let apiResponse=response.generate(true,'recoveryPassword is not being updated',500,null)
                reject(apiResponse);
            }
            else{
            resolve(result);
            console.log(result);
            console.log('while sending mail',userDetail.email);
            let mailOptions={
                from:'vnags@SpeechGrammarList.com',
                to:userDetail.email,
                subject:"password reset",
                html: `<h4> Hi ${userDetail.firstName}</h4>
                       <p>
                           We got a request to reset your Expense Management account password associated with this ${req.body.email} Email. <br>
                           <br>We have successfully reset your password. Please use following password as a recovery password while resetting the Password <br>
                           <br> Recovery Password : ${recovery.recoveryPassword} 
                       </p>
                        ExpenseManagement
                        <br><b>v sravani </b> `    
    
            }
            emailLib.sendEmail(mailOptions);
        }
        
        })
    })
}
    checkUserEmail(req,res)
    .then(resetPassword)
    .then((resolve)=>{
        
        let apiResponse=response.generate(false,'recoveryPassword has been sent to your email plz check email',200,resolve)
        res.send(apiResponse);
    }).catch((err)=>{
        res.send(err);
    })

}//end reset password function


let updatePasswordFunction = (req, res) => {

    let findUser = () => {
        console.log('recoveryPassword' , req.body.recoveryPassword);
        return new Promise((resolve, reject) => {
            if (!check.isEmpty(req.body.recoveryPassword)) {
                userModel.findOne({ recoveryPassword: req.body.recoveryPassword }, (err, userDetails) => {
                    /* handle the error here if the User is not found */
                    if (err) {
                        console.log(err)
                        logger.error('Failed To Retrieve User Data while updating password')
                        /* generate the error message and the api response message here */
                        let apiResponse = response.generate(true, 'Failed To Find User Details to update password', 500, null)
                        reject(apiResponse)
                        /* if Company Details is not found */
                    } else if (check.isEmpty(userDetails)) {
                        /* generate the response and the console error message here */
                        logger.error('No User Found  while updating password')
                        let apiResponse = response.generate(true, 'No User Details Found to update password', 404, null)
                        reject(apiResponse)
                    } else {
                        /* prepare the message and the api response here */
                        logger.info('User Found');
                        resolve(userDetails)
                    }
                });

            } else {
                let apiResponse = response.generate(true, '"recoveryPassword" parameter is missing', 400, null)
                reject(apiResponse)
            }
        })
    }

    let passwordUpdate = (userDetails) => {
        return new Promise((resolve, reject) => {

            let options = {
                password: password.hashpassword(req.body.password),
            }

            userModel.update({ 'userId': userDetails.userId }, options).exec((err, result) => {
                if (err) {
                    console.log(err)
                    logger.error(err.message+'User Controller:updatePasswordFunction')
                    let apiResponse = response.generate(true, 'Failed To reset user Password', 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(result)) {
                    logger.info('No User Found with given Details to update password')
                    let apiResponse = response.generate(true, 'No User Found', 404, null)
                    reject(apiResponse)
                } else {
                    console.log('update password',result);
                    let mailOptions={
                        from:'vnags@SpeechGrammarList.com',
                        to:userDetails.email,
                        subject:"password reset",
                        html: `<h4> Hi ${userDetails.firstName}</h4>
                               <p>
                                   password updated suucessfully 
                               </p>

                                ExpenseManagement
                                <br><b>v sravani </b> `    
            
                    }
                    emailLib.sendEmail(mailOptions);
                    let apiResponse = response.generate(false, 'Password Updated successfully', 200, result)
                    resolve(apiResponse);

                }
            });// end user model update
        });
    }//end passwordUpdate

    findUser(req, res)
        .then(passwordUpdate)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'Password Update Successfully', 200, resolve)
            res.status(200)
            res.send(apiResponse)
        })
        .catch((err) => {
            console.log("errorhandler");
            console.log(err);
            res.status(err.status)
            res.send(err)
        })


}






module.exports = {
    signUp: signUp,
    login:login,
    getAllUser:getAllUser,
    getSingleUser:getSingleUser,
    deleteUser:deleteUser,
    editUser:editUser,
    logout:logout,
    resetPasswordFunction:resetPasswordFunction,
    updatePasswordFunction:updatePasswordFunction
}





