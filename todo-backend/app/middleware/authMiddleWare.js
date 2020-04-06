const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const tokenLib = require('./../libs/tokenLib');
const response = require('./../libs/responseLib');
const check = require('./../libs/checkLib');
const logger = require('pino')();

const authModel = mongoose.model('AuthModel');

let isAuthorised = (req,res,next)=>{
    if (req.params.authToken || req.query.authToken || req.body.authToken || req.header('authToken')) {
        authModel.findOne({authToken: req.params.authToken || req.query.authToken || req.body.authToken || req.header('authToken')})
        .exec((err,result)=>{
            if(err)
            {
                logger.info('error occured while retriving aut in  middle ware')
               let apiresponse = response.generate(true,300,'failed to get authtoken',null);
               res.send(apiresponse);
            }
            else if(check.isEmpty(result)){
                logger.info('authtoken not found')
                let apiresponse = response.generate(true,300,'authtoken not found',null);
                res.send(apiresponse);          
            }
            else{
                tokenLib.verifyToken(result.authToken,result.tokenSecret , (err,decoded)=>{
                    if(err)
                    {
                        logger.info('authtoken expires');
                        let apiresponse = response.generate(true,300,'authtoken may expired or incorrect',null);
                         res.send(apiresponse);  

                    }
                    else{
                        logger.info('auth token found successfully');
                       // console.log(decoded);
                        req.user = {userId: decoded.data.userId};
                        next();
                    }
                })
            }
        })
    }
    else{
        logger.info('else part is working');
        let apiresponse = response.generate(true,500,'authtoken parameter is missing',null);
        res.send(apiresponse);  

    }//end isAuthorized 
}

module.exports = {
    isAuthorised:isAuthorised
}

