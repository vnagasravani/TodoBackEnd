const mongoose = require('mongoose');

const Schema = mongoose.Schema; 

let  UserModel = new Schema({

    userId:{
    type: String,
    default: '',
    index: true,
    unique: true
    },
    firstName:{
        type:String,
        default:''
    },
    lastName:{
        type:String,
        default:''
    },
    userName: {
        type: String,
        default: ''
      },
    country: {
        type: String,
        default: ''
      },
    email:{
        type:String,
        default:''
    },
    mobileNumber:{
        type:String,
        default:''
    },
    recoveryPassword:{
        type:String,
        default:''
    },
    password:{
        type:String,
        default:''
    },
     createdOn:{
        type:Date,
        default:Date.now()
    },
    friendList:{
        type:[{
            id:String,
            name:String,
            active:Boolean
        }],
        default:[]
    }
});

mongoose.model('UserModel',UserModel);




