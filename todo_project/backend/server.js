const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { User, Task } = require('./index');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// 🔐 Auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing authorization header' });

  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Input validation middleware
function validateTask(req, res, next) {
  const { title, priority, assignedTo } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }
  if (priority && !['High', 'Medium', 'Low'].includes(priority)) {
    return res.status(400).json({ error: 'Priority must be High, Medium, or Low' });
  }
  if (assignedTo && assignedTo !== 'Unassigned') {
    User.findOne({ email: assignedTo, role: 'employee' })
      .then(user => {
        if (!user) return res.status(400).json({ error: 'Assigned user must be a valid employee or Unassigned' });
        next();
      })
      .catch(err => res.status(500).json({ error: 'Error validating assigned user' }));
  } else {
    next();
  }
}

// 🧑 Register
app.post('/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  console.log("📩 Incoming register request body:", req.body);

  // Debugging all users (to see if collection is really empty)
  const allUsers = await User.find({});
  console.log("📊 All users currently in DB:", allUsers);

  if (!email || !password || !role) {
    console.log("❌ Missing fields in request");
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }
  if (!['manager', 'employee'].includes(role)) {
    console.log("❌ Invalid role:", role);
    return res.status(400).json({ error: 'Role must be manager or employee' });
  }
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    console.log("❌ Invalid email format:", email);
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 6) {
    console.log("❌ Password too short");
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    console.log("🔍 Checking if user exists with email:", normalizedEmail);

    const exists = await User.findOne({ email: normalizedEmail });
    console.log("📌 Result of User.findOne:", exists);

    if (exists) {
      console.log("⚠️ User already exists with this email:", normalizedEmail);
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    console.log("🔑 Hashing password...");
    const hash = await bcrypt.hash(password, 10);

    console.log("📝 Creating new user...");
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hash,
      role
    });

    console.log("✅ User created successfully:", user);

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("💥 Error during registration:", err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});


// 🔑 Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// 🩺 Health check
app.get('/health', (req, res) => res.json({ message: 'Server is running', ok: true }));

// 👥 Get all employees (for assignment dropdown)
app.get('/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Only managers can view users' });
  }

  try {
    const users = await User.find({ role: 'employee' }).select('_id name email');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 📋 Get tasks (role-based filtering)
app.get('/tasks', authMiddleware, async (req, res) => {
  const { role, email } = req.user;

  try {
    const query = role === 'employee' ? { assignedTo: email } : {};
    const tasks = await Task.find(query).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ➕ Create task (manager only)
app.post('/tasks', authMiddleware, validateTask, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Only managers can create tasks' });
  }

  const { title, description, dueDate, priority, assignedTo } = req.body;

  try {
    const task = await Task.create({
      userId: req.user.id,
      assignedTo: assignedTo || 'Unassigned',
      title,
      description,
      dueDate,
      priority: priority || 'Medium',
      completed: false
    });
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ✏️ Update task
app.put('/tasks/:id', authMiddleware, validateTask, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { role, email } = req.user;

    if (role === 'employee') {
      if (task.assignedTo !== email) {
        return res.status(403).json({ error: 'Not authorized to update this task' });
      }
      if (Object.keys(req.body).some(key => key !== 'completed')) {
        return res.status(403).json({ error: 'Employees can only update task completion status' });
      }
      task.completed = req.body.completed;
    } else {
      Object.assign(task, req.body, { updatedAt: Date.now() });
    }

    await task.save();
    res.json({ message: 'Task updated successfully', task });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});
// 🗑️ Delete task (manager only)
app.delete('/tasks/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Only managers can delete tasks' });
  }

  try {
    const result = await Task.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Task not found or already deleted' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});


// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🚀 Server running on port ${PORT}`);

});