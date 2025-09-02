import React, { useState, useEffect } from "react";

function App() {
  const API_BASE = 'http://localhost:4000';
  // State for authentication
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState("employee");
  const [error, setError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // State for tasks
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [editingTask, setEditingTask] = useState(null);

  // UI states
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  // Load from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch tasks and users when user changes
  useEffect(() => {
    if (user) {
      fetchTasks();
      if (user.role === "manager") {
        fetchUsers();
      }
    }
  }, [user]);

  // Dark mode
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Auth functions
  const handleAuth = async () => {
    setError("");
    const headers = { "Content-Type": "application/json" };

    if (isLogin) {
      if (!email || !password) {
        setError("Please fill in email and password");
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers,
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Login failed");
        }
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setShowAuthModal(false);
      } catch (err) {
        setError(err.message);
      }
    } else {
      if (!name || !email || !password) {
        setError("Please fill in name, email and password");
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name, email, password, role }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Registration failed");
        }
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setShowAuthModal(false);
      } catch (err) {
        setError(err.message);
      }
    }

    // Clear input fields
    setName("");
    setEmail("");
    setPassword("");
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setTasks([]);
    setUsers([]);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // Fetch functions
  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) handleLogout();
        throw new Error("Failed to fetch tasks");
      }
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) handleLogout();
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Task functions
  const capitalizePriority = (p) => p.charAt(0).toUpperCase() + p.slice(1);

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    const body = {
      title: newTask,
      description: description,
      dueDate,
      priority: capitalizePriority(priority),
      assignedTo: assignee || "Unassigned",
    };
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create task");
      await fetchTasks();
      setNewTask("");
      setDescription("");
      setAssignee("");
      setDueDate("");
      setPriority("medium");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete task");
      await fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTask = async (id) => {
    const task = tasks.find((t) => t._id === id);
    if (!task) return;
    const completed = !task.completed;
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      await fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setNewTask(task.title);
    setDescription(task.description || "");
    setAssignee(task.assignedTo === "Unassigned" ? "" : task.assignedTo);
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    setPriority(task.priority.toLowerCase());
  };

  const handleUpdateTask = async () => {
    if (!newTask.trim()) return;
    const body = {
      title: newTask,
      description: description,
      dueDate,
      priority: capitalizePriority(priority),
      assignedTo: assignee || "Unassigned",
    };
    try {
      const res = await fetch(`${API_BASE}/tasks/${editingTask._id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update task");
      await fetchTasks();
      setEditingTask(null);
      setNewTask("");
      setDescription("");
      setAssignee("");
      setDueDate("");
      setPriority("medium");
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered and sorted tasks
  const filteredTasks = tasks
    .filter((task) => {
      if (filter === "completed" && !task.completed) return false;
      if (filter === "active" && task.completed) return false;
      return task.title.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "dueDate")
        return new Date(a.dueDate) - new Date(b.dueDate);
      if (sortBy === "priority") {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    });

  // Progress tracking
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t) => t.completed).length;
  const progress = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  const getAssigneeName = (assignedTo) => {
    if (assignedTo === "Unassigned") return "Unassigned";
    const foundUser = users.find((u) => u.email === assignedTo);
    return foundUser ? foundUser.name : assignedTo;
  };

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      <div className="container mx-auto p-4">
        <header className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">To-Do List App</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-3 py-1 rounded bg-gray-700 text-white"
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
            {user ? (
              <button
                onClick={handleLogout}
                className="px-3 py-1 rounded bg-red-600 text-white"
              >
                Logout ({user.name})
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1 rounded bg-blue-600 text-white"
              >
                Login / Register
              </button>
            )}
          </div>
        </header>

        {user && (
          <div>
            {/* Task input - manager only */}
            {user.role === "manager" && (
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  placeholder="New task title"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  className="flex-1 p-2 rounded bg-gray-200 text-gray-900 placeholder-gray-400 dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex-1 p-2 rounded bg-gray-200 text-gray-900 placeholder-gray-400 dark:bg-gray-700 dark:text-white"
                />
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="p-2 rounded bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {users.map((emp) => (
                    <option key={emp._id} value={emp.email}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="p-2 rounded bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
                />
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="p-2 rounded bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                {editingTask ? (
                  <button
                    onClick={handleUpdateTask}
                    className="px-4 py-2 bg-green-600 text-white rounded"
                  >
                    Update
                  </button>
                ) : (
                  <button
                    onClick={handleAddTask}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Add
                  </button>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-4">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="p-2 rounded bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 p-2 rounded bg-gray-200 text-gray-900 placeholder-gray-400 dark:bg-gray-700 dark:text-white"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-2 rounded bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
              >
                <option value="dueDate">Sort by Due Date</option>
                <option value="priority">Sort by Priority</option>
              </select>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="bg-gray-300 dark:bg-gray-700 h-4 rounded overflow-hidden">
                <div
                  className="bg-green-500 h-4"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm mt-1">{progress}% completed</p>
            </div>

            {/* Task list */}
            <ul>
              {filteredTasks.map((task) => (
                <li
                  key={task._id}
                  className="flex justify-between items-center p-2 mb-2 rounded bg-white dark:bg-gray-800"
                >
                  <div className="flex flex-col">
                    <div>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task._id)}
                        className="mr-2"
                      />
                      <span className={task.completed ? "line-through" : ""}>
                        {task.title}
                      </span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        (Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A"}, {task.priority})
                      </span>
                      {user.role === "manager" && (
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          Assigned to: {getAssigneeName(task.assignedTo)}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 ml-4">
                        {task.description}
                      </p>
                    )}
                  </div>
                  {user.role === "manager" && (
                    <div>
                      <button
                        onClick={() => handleEditTask(task)}
                        className="px-2 py-1 bg-yellow-500 text-white rounded mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        className="px-2 py-1 bg-red-600 text-white rounded"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-80">
              <h2 className="text-xl mb-4 text-gray-900 dark:text-white">
                {isLogin ? "Login" : "Register"}
              </h2>
              {error && <p className="text-red-500 mb-2">{error}</p>}
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded bg-gray-200 text-gray-900 placeholder-gray-400 dark:bg-gray-700 dark:text-white mb-2"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 rounded bg-gray-200 text-gray-900 placeholder-gray-400 dark:bg-gray-700 dark:text-white mb-2"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 rounded bg-gray-200 text-gray-900 placeholder-gray-400 dark:bg-gray-700 dark:text-white mb-2"
              />
              {!isLogin && (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2 rounded bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white mb-2"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              )}
              <button
                onClick={handleAuth}
                className="w-full py-2 bg-blue-600 text-white rounded mb-2"
              >
                {isLogin ? "Login" : "Register"}
              </button>
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full py-2 bg-gray-600 text-white rounded mb-2"
              >
                Switch to {isLogin ? "Register" : "Login"}
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full py-2 bg-red-600 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;