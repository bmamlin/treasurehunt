var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PlayerSchema = new Schema({  
    id: { type: String, required: true },
    url: String,
    name: { type: String, required: true, trim: true },
    org: String,
    email: String,
    phone: { type:String, trim: true },
    achievements: [
    	{
    		achievement: String,
    		achieved_at: { type: Date, default: Date.now }
    	}
    ],
    active: { type:Boolean, default:false },
    disabled: { type:Boolean, default:false }
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Player', PlayerSchema);