const mongoose = require('mongoose');
const schema = mongoose.Schema;


let ItemHistorySchema = new schema ({
    items: 
        [{
            itemId: { type: String, default: '' },
            itemName: { type: String, default: '' },
            itemComplete: { type: Boolean, default: false },
            subItemList: [
                {
                    subItemId: { type: String, default: '' },
                    subItemName: { type: String, default: '' },
                    subItemComplete: { type: Boolean, default: false },
                }]
        }]

});

module.exports = mongoose.model('ItemHistory', ItemHistorySchema);