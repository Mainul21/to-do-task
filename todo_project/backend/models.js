const mongoose = require('mongoose');

// User Schema with role field
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['manager', 'employee'],
    required: true
  },
  createdAt: { type: Date, default: Date.now }
});

// Task Schema with assignment support
const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // creator
  assignedTo: { type: String, required: false }, // email of assigned employee
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

module.exports = { User, Task };
