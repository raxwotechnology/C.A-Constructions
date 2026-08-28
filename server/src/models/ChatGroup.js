const mongoose = require('mongoose');

const chatGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  avatar: String,
}, { timestamps: true });

module.exports = mongoose.model('ChatGroup', chatGroupSchema);
