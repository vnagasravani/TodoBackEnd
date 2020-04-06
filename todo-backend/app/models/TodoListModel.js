const mongoose = require('mongoose');
const time = require('./../libs/timeLib')
const schema = mongoose.Schema;

let todoListSchema = new schema(
    {
        todoId: {
            type: String,
            index: true,
            default: ''
        },
        userId: {
            type: String,
            default: ''
        },
        userName: {
            type: String,
            default: ''
        },
        todoTitle: {
            type: String,
            default: ''
        },
        itemList:
         [
            {
                itemId: { type: String, default: '' },
                itemName: { type: String, default: '' },
                itemComplete: { type: Boolean, default: false },
                subItemList: [
                    {
                        subItemId: { type: String, default: '' },
                        subItemName: { type: String, default: '' },
                        subItemComplete: { type: Boolean, default: false },
                    }]
            }],
        complete: {
            type: Boolean,
            default: false
        },
        createdOn: {
            type: Date,
            default: time.now()
        }
    }
)

module.exports = mongoose.model('todoList', todoListSchema)