var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const AUTHTOKEN_TTL = '30d'; // authtoken lasts 30 days by default

var AuthTokenSchema = new Schema({  
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    created_at: { type: Date, default: Date.now, expires: AUTHTOKEN_TTL}
},
{
    timestamps: { createdAt: 'created_at' }
});

module.exports = mongoose.model('AuthToken', AuthTokenSchema);