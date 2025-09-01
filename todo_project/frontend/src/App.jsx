import React, { useState, useEffect } from "react";

function App() {
  // State for authentication
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(() => {
    const savedUsers = localStorage.getItem("users");
    return savedUsers ? JSON.parse(savedUsers) : [];
  });
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState("employee");
  const [error, setError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // State for tasks
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem("tasks");
    return savedTasks ? JSON.parse(savedTasks) : [];
  });
  const [newTask, setNewTask] = useState("");
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

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Auth functions
  const handleAuth = () => {
    // validation differs for login vs register
    if (isLogin) {
      if (!username || !password) {
        setError("Please fill in both username and password");
        return;
      }
      const foundUser = users.find(
        (u) => u.username === username && u.password === password
      );
      if (foundUser) {
        setUser(foundUser);
        setShowAuthModal(false);
        setError("");
      } else {
        setError("Invalid credentials");
      }
    } else {
      if (!username || !email || !password) {
        setError("Please fill in username, email and password");
        return;
      }
      if (users.some((u) => u.username === username || u.email === email)) {
        setError("Username or email already exists");
        return;
      }
      const newUser = { username, email, password, role };
      setUsers([...users, newUser]);
      setUser(newUser);
      setShowAuthModal(false);
      setError("");
    }

    // clear input fields
    setUsername("");
    setEmail("");
    setPassword("");
  };

  const handleLogout = () => {
    setUser(null);
  };

  // Task functions
  const handleAddTask = () => {
    if (!newTask.trim()) return;
    const task = {
      id: Date.now(),
      text: newTask,
      completed: false,
      assignee: assignee || (user ? user.username : ""),
      dueDate,
      priority,
    };
    setTasks([...tasks, task]);
    setNewTask("");
    setAssignee("");
    setDueDate("");
    setPriority("medium");
  };

  const handleDeleteTask = (id) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const handleToggleTask = (id) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setNewTask(task.text);
    setAssignee(task.assignee);
    setDueDate(task.dueDate);
    setPriority(task.priority);
  };

  const handleUpdateTask = () => {
    if (!newTask.trim()) return;
    setTasks(
      tasks.map((task) =>
        task.id === editingTask.id
          ? { ...task, text: newTask, assignee, dueDate, priority }
          : task
      )
    );
    setEditingTask(null);
    setNewTask("");
    setAssignee("");
    setDueDate("");
    setPriority("medium");
  };

  // Filtered and sorted tasks
  const filteredTasks = tasks
    .filter((task) => {
      // if user is an employee only show their tasks
      if (user && user.role === "employee" && task.assignee !== user.username)
        return false;
      if (filter === "completed" && !task.completed) return false;
      if (filter === "active" && task.completed) return false;
      return task.text.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "dueDate")
        return new Date(a.dueDate) - new Date(b.dueDate);
      if (sortBy === "priority") {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
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
                Logout ({user.username})
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
            {/* Task input */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="New task"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="flex-1 p-2 rounded bg-gray-200 text-gray-900 placeholder-gray-400 dark:bg-gray-700 dark:text-white"
              />
              {user.role === "manager" && (
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="p-2 rounded bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Assign to...</option>
                  {users
                    .filter((u) => u.role === "employee")
                    .map((emp) => (
                      <option key={emp.username} value={emp.username}>
                        {emp.username}
                      </option>
                    ))}
                </select>
              )}
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
                  key={task.id}
                  className="flex justify-between items-center p-2 mb-2 rounded bg-white text-white dark:bg-gray-800"
                >
                  <div>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="mr-2"
                    />
                    <span className={task.completed ? "line-through" : ""}>
                      {task.text}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      (Due: {task.dueDate || "N/A"}, {task.priority})
                    </span>
                    {user.role === "manager" && (
                      <span className="ml-2 text-sm text-gray-500">
                        Assigned to: {task.assignee}
                      </span>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => handleEditTask(task)}
                      className="px-2 py-1 bg-yellow-500 text-white rounded mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded"
                    >
                      Delete
                    </button>
                  </div>
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
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 rounded bg-gray-200 text-gray-900 placeholder-gray-400 dark:bg-gray-700 dark:text-white mb-2"
              />
              {!isLogin && (
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400 mb-2"
                />
              )}
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
