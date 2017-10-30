var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AchievementSchema = new Schema({  
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: String,
    image_url: String,
    url: String
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Achievement', AchievementSchema);