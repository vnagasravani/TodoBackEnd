const express = require ('express');
const todoController = require('./../controllers/TOdoListController');
const authmw = require('./../middleware/authMiddleWare')

let setRouter = (app)=>{
  app.post('/gettodos',todoController.getAllTodoListsFunction);
  app.post('/getrequests',todoController.getFriendRequestsFunction);
  app.post('/getctodos',todoController.getAllCompleteTodoListsFunction);
  
}

module.exports={
    setRouter:setRouter
}