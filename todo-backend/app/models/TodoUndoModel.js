const mongoose = require('mongoose');
const time = require('./../libs/timeLib')
const schema = mongoose.Schema;

let TodoUndoModel = new schema(
    {
        userId:{
            type:String
        },
        todoId :{
            type:String,
            
        },
        todo:
        {
            todoId: {
                type: String,
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
        
        },
        modifiedTime :{
            type:Date,
            default:time.now()
        },
        created:{
            type:Boolean,
            default:false
        }
        ,
        deleted:{
            type:Boolean,
            default:false
        }
    }
)

module.exports = mongoose.model('TodoUndoModel', TodoUndoModel );