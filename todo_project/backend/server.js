const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { User, Task } = require('./models');

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
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// 🧑 Register
app.post('/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'Email, password, and role required' });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ error: 'User already exists' });

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: email.toLowerCase(), password: hash, role });

  const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// 🔑 Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// 🩺 Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// 👥 Get all employees (for assignment dropdown)
app.get('/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can view users' });

  const users = await User.find({ role: 'employee' }).select('name email');
  res.json(users);
});

// 📋 Get tasks (role-based filtering)
app.get('/tasks', authMiddleware, async (req, res) => {
  const { role, email } = req.user;

  let query = {};
  if (role === 'employee') {
    query.assignedTo = email;
  }

  try {
    const tasks = await Task.find(query).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ➕ Create task (manager only)
app.post('/tasks', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can create tasks' });

  const { title, description, dueDate, priority, assignedTo } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    const task = await Task.create({
      userId: req.user.id,
      assignedTo,
      title,
      description,
      dueDate,
      priority,
      completed: false
    });

    res.json(task);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ✏️ Update task
app.put('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { role, email } = req.user;

    if (role === 'employee') {
      if (task.assignedTo !== email) {
        return res.status(403).json({ error: 'Not authorized to update this task' });
      }
      task.completed = req.body.completed;
    } else {
      Object.assign(task, req.body, { updatedAt: Date.now() });
    }

    await task.save();
    res.json(task);
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

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
