const socketio = require('socket.io');
logger = require('pino')();
const mongoose = require('mongoose');
const shortid = require('shortid');
const events = require('events');
const response = require('./../libs/responseLib');
const time = require('./../libs/timeLib');
const tokenLib = require('./../libs/tokenLib');
const check = require('./../libs/checkLib');
const eventEmitter = new events.EventEmitter();
const todo = require('./../models/TodoListModel');
const request = require('./../models/FriendRequestModel');
const user = require('./../models/UserModel');
const undo = require('./../models/TodoUndoModel');

const todoListModel = mongoose.model('todoList');
const requestModel = mongoose.model('friendRequest');
const UserModel = mongoose.model('UserModel');
const todoUndoModel = mongoose.model('TodoUndoModel');

let setServer = (server) => {

    let io = socketio.listen(server);
    let myIo = io.of('');
    let onlineUserList = [];
    myIo.on('connection', (socket) => {


        socket.emit("verify", '');
        socket.on('set-user', function (authToken) {
            tokenLib.verifyClaimWithOutSecret(authToken, (err, decoded) => {
                if (err) {
                    socket.emit('auth-error', { status: 404, error: 'please provide auth token' });
                }
                else {
                    let currentUser = decoded.data;
                    socket.userId = currentUser.userId;
                    let fullName = `${currentUser.firstName} ${currentUser.lastName}`
                    console.log('user verified');
                    console.log(currentUser);
                    onlineUserList.push(fullName);

                    UserModel.findOne({ userId: decoded.data.userId }, (err, result) => {
                        if (result) {
                            let friends = result.friendList.filter(user => user.active == true);
                            for (let friend of friends) {
                                socket.join(friend.id);
                                console.log('friends joining into room', friend.id);
                            }
                        }
                        if (err) {
                            console.log('failed to retrive user while ading user to groups');
                        }


                    });





                }

            })

        })//end set-user

        socket.on('get-users', info => {
            const pageValue = parseInt(info.pageValue)
            const limit = parseInt(info.limit);
            let data = {
                userCount: 0,
                users: null
            }

            UserModel.find()
                .select(' -__v -_id')
                .skip(pageValue * limit)
                .lean()
                .limit(limit)
                .exec((err, result) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'User Controller: getAllUser', 10)
                        let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
                        socket.emit('get-users-response', apiResponse);
                    } else if (check.isEmpty(result)) {
                        logger.info('No User Found', 'User Controller: getAllUser')
                        let apiResponse = response.generate(true, 'No User Found', 404, null)
                        socket.emit('get-users-response', apiResponse);
                    } else {

                        data.users = result;
                        UserModel.find().countDocuments(function (err, result) {
                            data.userCount = result;
                            let apiResponse = response.generate(false, 'All User Details Found', 200, data)
                            socket.emit('get-users-response', apiResponse);
                        })

                    }
                })
        })

        socket.on('create-todo', data => {

            console.log('todo-title', data.todoTitle);

            todoListModel.find({ todoTitle: data.todoTitle, userId: data.userId }, (err, result) => {
                if (err) {
                    socket.emit('error-message', { status: 500, message: 'failed to create new todo list' })
                }
                else if (check.isEmpty(result)) {
                    let newTodoList = new todoListModel({
                        todoId: shortid.generate(),
                        todoTitle: data.todoTitle,
                        userId: data.userId,
                        userName: data.userName,
                        createdOn: time.getLocalTime()
                    })

                    newTodoList.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            socket.emit('get-update', result);
                            console.log('result', result);
                        }
                    })
                }
                else {
                    socket.emit('error-message', { status: 500, message: 'todo list already present with this todoTitle' })
                }
            })

        });//end create-todo

        socket.on('create-friend-todo', data => {
            console.log('create friend todo is called');
            todoListModel.find({ todoTitle: data.todoTitle, userId: data.userId }, (err, result) => {
                if (err) {
                    socket.emit('error-message', { status: 500, message: 'failed to create new todo list' })
                }
                else if (check.isEmpty(result)) {
                    let newTodoList = new todoListModel({
                        todoId: shortid.generate(),
                        todoTitle: data.todoTitle,
                        userId: data.userId,
                        userName: data.userName,
                        createdOn: time.getLocalTime()
                    })

                    newTodoList.save((err, stodo) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            // socket.emit('get-update', result);
                             console.log('result new todolist', stodo);
                            let newUndoModel = new todoUndoModel({
                                userId: data.userId,
                                todoId: stodo.todoId,
                                todo: null,
                                modifiedTime: time.getLocalTime(),
                                created: true
                            });

                            newUndoModel.save((err, result) => {
                                if (err) {
                                    console.log('err occured',err);
                                    socket.emit('error-message', { status: 500, message: 'failed to save friend todo list' })
                                }
                                else {
                                    let dataa={
                                        todo:stodo,
                                        msg:`A todo is created by ${data.otherUser} in list of ${data.userName}`
                                    }
                                    socket.emit('friend-create-todo', dataa);
                                    socket.to(data.userId).emit('friend-create-todo', dataa);
                                    myIo.emit('fcreate-todo', stodo);

                                }
                            })


                        }
                    })
                }
                else {
                    socket.emit('error-message', { status: 500, message: 'todo list already present with this todoTitle' })
                }
            })

        })//end create-friend-todo 

        socket.on('add-item', (data) => {
            todoListModel.findOneAndUpdate({ todoId: data.todoId }, {complete:false, $push: { 'itemList': { 'itemId': shortid.generate(), 'itemName': data.itemName } } }, { new: true })
                .exec((err, result) => {

                    if (err) {
                        socket.emit('error-message', { status: 500, message: 'error occured while adding new item' })
                    }
                    else if (check.isEmpty(result)) {
                        socket.emit('error-message', { status: 500, message: 'item detail not found' })
                    }
                    else {
                        socket.emit('get-update', result);
                    }

                })
        })//end add-item

        socket.on('add-friend-item', data => {
            todoListModel.findOneAndUpdate({ todoId: data.todoId }, {complete:false, $push: { 'itemList': { 'itemId': shortid.generate(), 'itemName': data.itemName } } }, { new: true })
                .exec((err, todo) => {

                    if (err) {
                        socket.emit('error-message', { status: 500, message: 'error occured while adding new item' })
                    }
                    else if (check.isEmpty(todo)) {
                        socket.emit('error-message', { status: 500, message: 'item detail not found' })
                    }
                    else {

                        let newUndoModel = new todoUndoModel({
                            userId: data.userId,
                            todoId: data.todoId,
                            todo: data.todo,
                            modifiedTime: time.getLocalTime(),
                            created: false
                        });

                        newUndoModel.save((err, result) => {
                            if (err) {
                                socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                            }
                            else {
                                let dataa = {
                                    todo:todo,
                                    msg:`An item is added by ${data.otherUser} in todo of ${todo.todoTitle} in list of ${data.userName}`
                                }
                                socket.emit('get-friend-update', dataa);
                                socket.to(data.userId).emit('get-friend-update', dataa);
                                myIo.emit('f-get-update', todo);

                            }
                        })

                    }

                })
        })//end add-friend-item



        socket.on('add-sub-item', (data) => {
            todoListModel.findOneAndUpdate({ 'itemList.itemId': data.itemId }, {complete:false, $set:{'itemList.$[i].itemComplete':false} , $push: { 'itemList.$[i].subItemList': { 'subItemId': shortid.generate(), 'subItemName': data.subTaskName } } }, { arrayFilters: [{ 'i.itemId': data.itemId }], new: true }, (err, result) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while adding new sub item' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'sub item not found' })
                }
                else {
                    socket.emit('get-update', result);
                }

            })
        }) //end add-sub-item



        socket.on('add-friend-sub-item', data => {
            todoListModel.findOneAndUpdate({ 'itemList.itemId': data.itemId }, {complete:false, $set:{'itemList.$[i].itemComplete':false} , $push: { 'itemList.$[i].subItemList': { 'subItemId': shortid.generate(), 'subItemName': data.subTaskName } } }, { arrayFilters: [{ 'i.itemId': data.itemId }], new: true }, (err, todo) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while adding new sub item' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'sub item not found' })
                }
                else {
                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            console.log('err',err);
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list in add-friend-sub-item' })
                        }
                        else {
                            let dataa = {
                                todo:todo,
                                msg:`A subItem is added by ${data.otherUser} in  todo of ${todo.todoTitle} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);

                        }
                    })

                }

            })

        })//end add-friend-sub-item

        socket.on('update-todo', (data) => {
            todoListModel.findOneAndUpdate({ 'todoId': data.todoId }, { todoTitle: data.todoTitle }, { new: true }, (err, result) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while updating item' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {
                    socket.emit('get-update', result);
                }

            })
        })//end update-todo

        socket.on('update-friend-todo', data => {
            todoListModel.findOneAndUpdate({ 'todoId': data.todoId }, { todoTitle: data.todoTitle }, { new: true }, (err, todo) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while updating item' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {
                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            let dataa={
                                todo:todo,
                                msg:`A todo named ${data.todo.todoTitle} is updated to ${todo.todoTitle} by ${data.otherUser} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);
                        }
                    })

                }

            })


        })//end update-friend-todo



        socket.on('update-item', (data) => {
            todoListModel.findOneAndUpdate({ 'itemList.itemId': data.itemId }, { $set: { 'itemList.$.itemName': data.itemName } }, { new: true }, (err, result) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while updating item' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {
                    socket.emit('get-update', result);
                }

            })
        })//end update-item


        socket.on('update-friend-item', data => {
            todoListModel.findOneAndUpdate({ 'itemList.itemId': data.itemId }, { $set: { 'itemList.$.itemName': data.itemName } }, { new: true }, (err, todo) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while updating item' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {
                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            let dataa={
                                todo:todo,
                                msg:`A item in todo named ${data.todo.todoTitle} is updated to ${data.itemName} by ${data.otherUser} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);
                            
                        }
                    })
                }

            })

        })//nd update-friend-item

        socket.on('update-sub-item', (data) => {
            todoListModel.findOneAndUpdate({ todoId: data.todoId }, { $set: { 'itemList.$[i].subItemList.$[j].subItemName': data.subItemName } }, { arrayFilters: [{ 'i.itemId': data.itemId }, { 'j.subItemId': data.subItemId }], new: true }, (err, result) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while updating sub-item ' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'sub-item detail not found ' })
                }
                else {
                    socket.emit('get-update', result);
                }

            })
        })//end update-sub-item

        socket.on('update-friend-sub-item', data => {
            todoListModel.findOneAndUpdate({ todoId: data.todoId }, { $set: { 'itemList.$[i].subItemList.$[j].subItemName': data.subItemName } }, { arrayFilters: [{ 'i.itemId': data.itemId }, { 'j.subItemId': data.subItemId }], new: true }, (err, todo) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while updating sub-item ' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'sub-item detail not found ' })
                }
                else {
                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            let dataa={
                                todo:todo,
                                msg:`A subitem in todo named ${data.todo.todoTitle} is updated to ${data.subItemName} by ${data.otherUser} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);
                            
                        }
                    })

                }

            })

        })//end update-friend-sub-item

        socket.on('delete-todoList', (data) => {
            todoListModel.findOneAndRemove({ todoId: data.todoId }, (err, result) => {
                if (err) {
                    socket.emit('error-message', { status: 500, message: 'failed to delete todo list' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'todo list not found' })
                }
                else {
                    console.log('deleted succesfully');
                    socket.emit('delete-todoList-response', result);
                }

            })
        })//end delete-todoList


        socket.on('delete-friend-todo', data => {
            todoListModel.findOneAndRemove({ todoId: data.todoId }, (err, todo) => {
                if (err) {
                    socket.emit('error-message', { status: 500, message: 'failed to delete todo list' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'todo list not found' })
                }
                else {
                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false,
                        deleted: true
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            let dataa={
                                todo:todo,
                                msg:`A todo is ${todo.todoTitle} deleted  by ${data.otherUser} in list of ${data.userName}`
                            }
                            
                            console.log(result);
                            socket.emit('friend-delete-todo', dataa);
                            socket.to(data.userId).emit('friend-delete-todo', dataa);
                            myIo.emit('f-delete-todo', todo);

                        }
                    })

                }

            })


        })//end delete-friend-todo


        socket.on('delete-item', (data) => {
            todoListModel.findOneAndUpdate({ 'itemList.itemId': data.itemId }, { $pull: { 'itemList': { 'itemId': data.itemId } } }, { new: true }, (err, result) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'failed to delete item' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {
                    socket.emit('get-update', result);
                }

            })

        })//end delete-item

        socket.on('delete-friend-item', data => {
            todoListModel.findOneAndUpdate({ 'itemList.itemId': data.itemId }, { $pull: { 'itemList': { 'itemId': data.itemId } } }, { new: true }, (err, todo) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'failed to delete item' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {
                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {

                            let dataa={
                                todo:todo,
                                msg:`A item is deleted in todo named ${todo.todoTitle}  by ${data.otherUser} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);
                            
                        }
                    })

                }

            })

        })//end delete-friend-item


        socket.on('delete-sub-item', (data) => {
            todoListModel.findOneAndUpdate({ 'itemList.subItemList.subItemId': data.subItemId }, { $pull: { 'itemList.$.subItemList': { 'subItemId': data.subItemId } } }, { new: true }, (err, result) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'failed to delete sub item' })
                }
                else {
                    socket.emit('get-update', result);
                }
            })
        })//end delete-sub-item


        socket.on('delete-friend-sub-item', data => {
            todoListModel.findOneAndUpdate({ 'itemList.subItemList.subItemId': data.subItemId }, { $pull: { 'itemList.$.subItemList': { 'subItemId': data.subItemId } } }, { new: true }, (err, todo) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'failed to delete sub item' })
                }
                else {
                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            let dataa={
                                todo:todo,
                                msg:`A subItem is deleted in todo named ${todo.todoTitle}  by ${data.otherUser} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);
                            
                        }
                    })

                }
            })
        })//end delete-friend-sub-item


        socket.on('undo', data => {
            console.log('in undo socket ');
            todoUndoModel.find({ userId: data.userId })
                .select(' -__v -_id')
                .sort({ modifiedTime: -1 })
                .limit(1)
                .exec((err, result) => {
                    if (err) {
                        socket.emit('error-message', { status: 500, message: 'failed to retrive undos' })

                    }
                    else if (check.isEmpty(result)) {
                        socket.emit('error-message', { status: 500, message: 'no undos found' })

                    }
                    else {
                        console.log(result[0]);
                        let undoTodo = result[0]
                        todoUndoModel.findOneAndRemove({ userId: undoTodo.userId, todoId: undoTodo.todoId, modifiedTime: undoTodo.modifiedTime }, (err, result) => {
                            if (err) {
                                socket.emit('error-message', { status: 500, message: 'failed to remove undo' })
                            }
                            else {
                                todoListModel.findOneAndUpdate({ todoId: result.todoId }, result.todo, { new: true })
                                    .exec((err, todo) => {
                                        if (err) {
                                            socket.emit('error-message', { status: 500, message: 'failed to update todo with undotodo' })

                                        }
                                        else {

                                            socket.emit('undo-response', undoTodo);
                                            socket.to(undoTodo.userId).emit('undo-response', undoTodo);
                                            myIo.emit('undo-i-response', undoTodo);

                                        }
                                    })
                            }
                        })
                    }

                })

        })//end undo


        socket.on('complete-todo', (data) => {
            todoListModel.findOneAndUpdate({ 'todoId': data.todoId }, { $set: { 'complete':true,'itemList.$[].itemComplete': true, 'itemList.$[].subItemList.$[].subItemComplete': true } }, { multi: true, new: true }, (err, result) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while marking item as completed' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {
                    socket.emit('get-update', result);
                }

            })
        })//end complete-todo

        socket.on('complete-friend-todo', (data) => {
            todoListModel.findOneAndUpdate({ 'todoId': data.todoId }, { $set: { 'complete':true,'itemList.$[].itemComplete': true, 'itemList.$[].subItemList.$[].subItemComplete': true } }, { multi: true, new: true }, (err, todo) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while marking item as completed' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {

                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            let dataa={
                                todo:todo,
                                msg:`A  todo named ${todo.todoTitle} is marked as done by ${data.otherUser} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);
                            

                        }
                    })
                    
                }

            })
        })//end complete-friend-todo

        socket.on('complete-item', (data) => {
            todoListModel.findOneAndUpdate({ 'itemList.itemId': data.itemId }, { $set: { 'itemList.$.itemComplete': true, 'itemList.$.subItemList.$[].subItemComplete': true } }, { multi: true, new: true }, (err, result) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while marking item as completed' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {
                    socket.emit('get-update', result);
                }

            })
        })//end complete-item

        socket.on('complete-friend-item', (data) => {
            todoListModel.findOneAndUpdate({ 'itemList.itemId': data.itemId }, { $set: { 'itemList.$.itemComplete': true, 'itemList.$.subItemList.$[].subItemComplete': true } }, { multi: true, new: true }, (err, todo) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while marking item as completed' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {

                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            let dataa={
                                todo:todo,
                                msg:`A  item in  todo named ${todo.todoTitle} is marked as done by ${data.otherUser} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);

                        }
                    })
                   
                }

            })
        })//end complete-friend-item

        socket.on('complete-sub-item', (data) => {
            todoListModel.findOneAndUpdate({ 'itemList.itemId': data.itemId }, { $set: { "itemList.$[i].subItemList.$[j].subItemComplete": true } }, { arrayFilters: [{ 'i.itemId': data.itemId }, { 'j.subItemId': data.subItemId }], multi: true, new: true }, (err, result) => {
                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while marking sub item as complete ' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'sub item not found ' })
                }
                else {
                    socket.emit('get-update', result);
                }

            })
        })//end complete-sub-item

        socket.on('complete-friend-sub-item', (data) => {
            todoListModel.findOneAndUpdate({ 'itemList.itemId': data.itemId }, { $set: { "itemList.$[i].subItemList.$[j].subItemComplete": true } }, { arrayFilters: [{ 'i.itemId': data.itemId }, { 'j.subItemId': data.subItemId }], multi: true, new: true }, (err, todo) => {
                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while marking sub item as complete ' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'sub item not found ' })
                }
                else {
                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            let dataa={
                                todo:todo,
                                msg:`A  subitem in  todo named ${todo.todoTitle} is marked as done by ${data.otherUser} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);

                        }
                    })
                   
                }

            })
        })//end complete-friend-sub-item

        socket.on('recomplete-todo', (data) => {
            todoListModel.findOneAndUpdate({ 'todoId': data.todoId }, { $set: { 'complete':false,'itemList.$[].itemComplete': false, 'itemList.$[].subItemList.$[].subItemComplete': false } }, { multi: true, new: true }, (err, result) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while marking item as completed' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {
                    socket.emit('get-update', result);
                }

            })
        })//end recomplete-todo

        socket.on('recomplete-friend-todo', (data) => {
            todoListModel.findOneAndUpdate({ 'todoId': data.todoId }, { $set: { 'complete':false,'itemList.$[].itemComplete': false, 'itemList.$[].subItemList.$[].subItemComplete': false } }, { multi: true, new: true }, (err, todo) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while marking item as completed' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {

                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            let dataa={
                                todo:todo,
                                msg:`A todo named ${todo.todoTitle} is marked as open by ${data.otherUser} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);

                        }
                    })
                   
                   
                }

            })
        })//end recomplete-friend-todo


        socket.on('recomplete-item', (data) => {
            todoListModel.findOneAndUpdate({'todoId':data.todoId, 'itemList.itemId': data.itemId }, { $set: { 'complete':false,'itemList.$.itemComplete': false, 'itemList.$.subItemList.$[].subItemComplete': false } }, { multi: true, new: true }, (err, result) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while marking item as completed' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {
                    socket.emit('get-update', result);
                }

            })
        })//end recomplete-item

        socket.on('recomplete-friend-item', (data) => {
            todoListModel.findOneAndUpdate({'todoId':data.todoId, 'itemList.itemId': data.itemId }, { $set: {'complete':false, 'itemList.$.itemComplete': false, 'itemList.$.subItemList.$[].subItemComplete': false } }, { multi: true, new: true }, (err, todo) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while marking item as completed' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'item not found' })
                }
                else {
                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            let dataa={
                                todo:todo,
                                msg:`A  item in  todo named ${todo.todoTitle} is marked as open by ${data.otherUser} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);


                        }
                    })
                    
                }

            })
        })//end recomplete-friend-item

        

        socket.on('recomplete-sub-item', (data) => {
            todoListModel.findOneAndUpdate({'todoId':data.todoId}, { $set: { 'complete':false, 'itemList.$[i].itemComplete': false,'itemList.$[i].subItemList.$[j].subItemComplete': false } }, { arrayFilters: [{ 'i.itemId': data.itemId }, { 'j.subItemId': data.subItemId }], multi: true ,new: true }, (err, result) => {

                if (err) {
                    console.log('err occured in recomplete-sub-item',err);
                    socket.emit('error-message', { status: 500, message: 'error occured while marking sub-item as not done ' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('error-message', { status: 500, message: 'sub-item detail not found ' })
                }
                else {
                    socket.emit('get-update', result);
                }

            })
        })

        socket.on('recomplete-friend-sub-item', (data) => {
            todoListModel.findOneAndUpdate({ 'todoId':data.todoId }, { $set: { 'complete':false,'itemList.$[i].itemComplete': false,"itemList.$[i].subItemList.$[j].subItemComplete": false } }, { arrayFilters: [{ 'i.itemId': data.itemId }, { 'j.subItemId': data.subItemId }], multi: true, new: true }, (err, todo) => {
                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while marking sub item as complete ' })
                }
                else if (check.isEmpty(todo)) {
                    socket.emit('error-message', { status: 500, message: 'sub item not found ' })
                }
                else {
                    let newUndoModel = new todoUndoModel({
                        userId: data.userId,
                        todoId: data.todoId,
                        todo: data.todo,
                        modifiedTime: time.getLocalTime(),
                        created: false
                    });

                    newUndoModel.save((err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save todo list' })
                        }
                        else {
                            let dataa={
                                todo:todo,
                                msg:`A  subitem in  todo named ${todo.todoTitle} is marked as open by ${data.otherUser} in list of ${data.userName}`
                            }
                            socket.emit('get-friend-update', dataa);
                            socket.to(data.userId).emit('get-friend-update', dataa);
                            myIo.emit('f-get-update', todo);
                        }
                    })
                    
                }

            })
        })//end recomplete-friend-sub-item


        socket.on('search-user', (userName) => {

            UserModel.find({ userName: { $regex: userName , $options: 'i' } }, (err, result) => {
                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while searching friend ' })
                }
                else if (check.isEmpty(result)) {
                    socket.emit('searched-result', result)
                }
                else {
                    socket.emit('searched-result', result)
                }
            })

        })//end search-user



        socket.on('send-request', (data) => {

            data.requestId = shortid.generate();
            requestModel.find({ $or: [{ $and: [{ senderId: data.recieverId }, { recieverId: data.senderId }, { active: false }] }, { $and: [{ senderId: data.senderId }, { recieverId: data.recieverId }, { active: false }] }] }, (err, request) => {

                if (err) {
                    socket.emit('error-message', { status: 500, message: 'failed to send friend request ' })
                }
                else if (check.isEmpty(request)) {
                    let requestDetail = new requestModel({
                        requestId: data.requestId,
                        senderId: data.senderId,
                        senderName: data.senderName,
                        recieverId: data.recieverId,
                        recieverName: data.recieverName
                    })
                    requestDetail.save((err, detail) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to save friend request ' })
                        }
                        else {
                            UserModel.findOneAndUpdate({ userId: data.senderId }, { $push: { 'friendList': { 'id': data.recieverId, 'name': data.recieverName, 'active': 'false' } } }, { new: true }, (err, result) => {
                                if (err) {
                                    socket.emit('error-message', { status: 500, message: 'failed to save friend request ' })
                                }
                                else if (check.isEmpty(result)) {
                                    socket.emit('error-message', { status: 500, message: 'user not found ' })
                                }
                                else {
                                    myIo.emit(`sent-request`, detail);
                                    socket.emit(`send-request-response`, result);
                                }
                            })
                        }
                    })
                }
                else {
                    socket.emit('error-message', { status: 500, message: data.recieverName + ' has already sent you a friend request' , data:request })
                }
            })
        })//end send-request

        socket.on('accept-request', (data) => {
            requestModel.findOneAndUpdate({ $and: [{ senderId: data.senderId }, { recieverId: data.recieverId }, { active: false }] }, { active: true }, { new: true }, (err, request) => {
                if (err) {
                    socket.emit('error-message', { status: 500, message: 'error occured while accepting friend request ' })
                }
                else if (check.isEmpty(request)) {
                    socket.emit('error-message', { status: 500, message: 'request not found ' })
                }
                else {
                    UserModel.findOneAndUpdate({ userId: data.recieverId }, { $push: { 'friendList': { 'id': data.senderId, 'name': data.senderName, 'active': 'true' } } }, { new: true }, (err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'error occured while adding friend detail in list ' })
                        }
                        else if (check.isEmpty(result)) {
                            socket.emit('error-message', { status: 500, message: 'friend detail not found ' })
                        }
                        else {
                            UserModel.findOneAndUpdate({ $and: [{ 'friendList.id': data.recieverId }, { userId: data.senderId }] }, { $set: { 'friendList.$.active': 'true' } }, { new: true }, (err, user2) => {
                                if (err) {
                                    socket.emit('error-message', { status: 500, message: 'error occured while updating friend detail ' })
                                }
                                else if (check.isEmpty(user2)) {
                                    socket.emit('error-message', { status: 500, message: 'friend detail not found ' })
                                }
                                else {
                                    myIo.emit(`accepted-request`, request);
                                    socket.emit(`accept-request-response`, user2);

                                }
                            })
                        }
                    })
                }
            })
        })//end accept-request


        socket.on('reject-request', (data) => {

            requestModel.findOneAndRemove({  requestId:data.requestId, senderId : data.senderId , recieverId : data.recieverId }, (err, request) => {
                if (err) {
                    console.log('reject-request'.err);
                    socket.emit('error-message', { status: 500, message: 'failed to reject request' })
                }
                else if (check.isEmpty(request)) {
                    console.log('reject-request',null);
                    socket.emit('error-message', { status: 500, message: 'friend request not found' })
                }
                else {
                    UserModel.update({ userId: data.senderId }, { $pull: { 'friendList': { 'id': data.recieverId } } }, (err, result) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to delete friend request' })
                        }
                        else if (check.isEmpty(result)) {
                            socket.emit('error-message', { status: 500, message: 'friend request not found ' })
                        }
                        else {
                            myIo.emit(`rejected-request`, request);
                            socket.emit(`reject-request-response`, request);

                        }
                    })
                }

            })

        })//end reject-request



        socket.on('unfriend', (data) => {

            UserModel.findOneAndUpdate({ userId: data.friendId }, { $pull: { 'friendList': { 'id': data.userId } } }, { new: true }, (err, reciever) => {
                if (err) {
                    socket.emit('error-message', { status: 500, message: 'failed to Unfriend ' })
                }
                else if (check.isEmpty(reciever)) {
                    socket.emit('error-message', { status: 500, message: 'friend not found' })
                }
                else {
                    UserModel.findOneAndUpdate({ userId: data.userId }, { $pull: { 'friendList': { 'id': data.friendId } } }, { new: true }, (err, sender) => {
                        if (err) {
                            socket.emit('error-message', { status: 500, message: 'failed to delete friend' })
                        }
                        else if (check.isEmpty(sender)) {
                            socket.emit('error-message', { status: 500, message: 'friend detail not found' })
                        }
                        else {
                            myIo.emit(`unfriend-ack`, reciever);
                            socket.emit(`unfriend-response`, sender);
                        }
                    })
                }
            })

        })//end unfriend 




        socket.on('disconnect', () => {
            console.log('user is disconnected');
            console.log(socket.userId);
            var removeIndex = onlineUserList.map(function (user) { return user.userId; }).indexOf(socket.userId);
            onlineUserList.splice(removeIndex, 1)
            console.log(onlineUserList);

        });

        socket.emit('online-user-list', onlineUserList);


    });


}

module.exports = {
    setServer: setServer
}