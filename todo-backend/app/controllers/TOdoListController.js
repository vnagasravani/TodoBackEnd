const mongoose = require('mongoose');
const shortid = require('shortid');
const user = require('./../models/UserModel');
const todo = require('./../models/TodoListModel');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const check = require('../libs/checkLib');


const userModel = mongoose.model('UserModel');
const todoListModel = mongoose.model('todoList');
const requestModel = mongoose.model('friendRequest');



let getAllTodoListsFunction = (req, res) => {
    let findTodoLists = () => {
        return new Promise((resolve, reject) => {
            todoListModel.find({ userId: req.body.userId }, (err, result) => {
                if (err) {
                    logger.error(true, 'todoListController: getAllTodoListsFunction', 10)
                    let apiResponse = response.generate(true, 'Failed To find todoLists', 500, null)
                    reject(apiResponse)
                }
                else if (check.isEmpty(result)) {
                    logger.error('todoLists not found', 'todoListController:getAllTodpListsFunction()', 4);
                    let apiResponse = response.generate(true, 'empty todoLists', 404, null)
                    reject(apiResponse);
                }
                else {
                    resolve(result);
                }
            })
        })
    }
    findTodoLists(req, res)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'todoList detail found', 200, resolve)
            res.send(apiResponse)
        }).catch((err) => {
            res.send(err)
        })
}


let getAllCompleteTodoListsFunction = (req, res) => {
    let findTodoLists = () => {
        return new Promise((resolve, reject) => {
            todoListModel.find({ userId: req.body.userId , complete:true }, (err, result) => {
                if (err) {
                    logger.error(true, 'todoListController: getAllTodoListsFunction', 10)
                    let apiResponse = response.generate(true, 'Failed To find todoLists', 500, null)
                    reject(apiResponse)
                }
                else if (check.isEmpty(result)) {
                    logger.error('todoLists not found', 'todoListController:getAllTodpListsFunction()', 4);
                    let apiResponse = response.generate(true, 'empty todoLists', 404, null)
                    reject(apiResponse);
                }
                else {
                    resolve(result);
                }
            })
        })
    }
    findTodoLists(req, res)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'todoList detail found', 200, resolve)
            res.send(apiResponse)
        }).catch((err) => {
            res.send(err)
        })
}




let getFriendRequestsFunction = (req, res) => {
    requestModel.find({ $and: [{ recieverId: req.body.userId }, { active: false }] }, (err, result) => {
        if (err) {
            logger.error(true, 'todoListController: getFriendRequestsFunction', 10)
            let apiResponse = response.generate(true, 'Failed To find friend requests', 500, null)
            res.send(apiResponse)
        }
        else if (check.isEmpty(result)) {
            logger.error('friend requests not found', 'todoListController:getFriendRequestsFunction()', 4);
            let apiResponse = response.generate(true, 'empty friend request list', 500, null)
            res.send(apiResponse);
        }
        else {
            let apiResponse = response.generate(false, 'friend request list found', 200, result);
            res.send(apiResponse)
        }
    })

}

module.exports = {
    getAllTodoListsFunction : getAllTodoListsFunction,
    getFriendRequestsFunction:getFriendRequestsFunction,
    getAllCompleteTodoListsFunction:getAllCompleteTodoListsFunction
}