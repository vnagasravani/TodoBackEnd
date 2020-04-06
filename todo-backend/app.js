const http = require('http');
const express = require('express');
const config = require('./config/config');
const mongoose = require('mongoose');
const tokenLib = require ('./app/libs/tokenLib');
const socketio = require('./app/socketLib/socket')
const bodyparser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express ();

const server = http.createServer(app);
server.listen(config.port);
server.on('error',onError);
server.on('listening',onListening);

//connecting server to socket
let socket = socketio.setServer(server);

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:false}));
app.use(express.static('client')); 

let modelsPath = './app/models';
let routesPath='./app/routes';

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  next();
});


//Bootstrap models
fs.readdirSync(modelsPath).forEach(function (file) {
    if (~file.indexOf('.js')) require(modelsPath + '/' + file)
  });
  // end Bootstrap models
  
  // Bootstrap route
  fs.readdirSync(routesPath).forEach(function (file) {
    if (~file.indexOf('.js')) {
      let route = require(routesPath + '/' + file);
      route.setRouter(app);
    }
  });

function onError(error) {
    if (error.syscall !== 'listen') {
      //logger.error(error.code + ' not equal listen', 'serverOnErrorHandler', 10)
      console.log(error);
      throw error;
    }
  
  
    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
       // logger.error(error.code + ':elavated privileges required', 'serverOnErrorHandler', 10);
       console.log('eacces error');
        process.exit(1);
        break;
      case 'EADDRINUSE':
       // logger.error(error.code + ':port is already in use.', 'serverOnErrorHandler', 10);
       console.log('eaddrinuse error');
        process.exit(1);
        break;
      default:
       // logger.error(error.code + ':some unknown error occured', 'serverOnErrorHandler', 10);
       console.log('some eeror while connecting server');
        throw error;
    }
  }



  function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    ('Listening on ' + bind);
    //logger.info('server listening on port' + addr.port, 'serverOnListeningHandler', 10);
    console.log('server listening on port'+config.port );
    let db = mongoose.connect(config.db.uri);
  }


  mongoose.connection.on('error', function (err) {
    console.log('database connection error');
    console.log(err)
    // logger.error(err,
    //   'mongoose connection on error handler', 10)
    //process.exit(1)
  }); // end mongoose connection error



  mongoose.connection.on('open', function (err) {
    if (err) {
      console.log("database error");
      console.log(err);
      //logger.error(err, 'mongoose connection open handler', 10)
    } else {
      console.log("database connection open success");
     // logger.info("database connection open",
        //'database connection open handler', 10)
    }
    //process.exit(1)
  })

  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
  });
