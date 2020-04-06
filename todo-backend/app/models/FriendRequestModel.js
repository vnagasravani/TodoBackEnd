const mongoose = require('mongoose');
const schema = mongoose.Schema;

let friendRequestSchema = new schema({

    requestId: {
        type: String,
        default: ''
    },
    senderId: {
        type: String,
        default: ''
    },
    senderName: {
        type: String,
        default: ''
    },
    recieverId: {
        type: String,
        default: ''
    },
    recieverName: {
        type: String,
        default: ''
    },
    active: {
        type: Boolean,
        default: false
    }
})

module.exports = mongoose.model('friendRequest', friendRequestSchema)