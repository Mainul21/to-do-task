const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['manager', 'employee'], required: true }
});

const taskSchema = new mongoose.Schema({
  userId: String,
  assignedTo: String,
  title: String,
  description: String,
  dueDate: String,
  priority: String,
  completed: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Task: mongoose.model('Task', taskSchema)
};
