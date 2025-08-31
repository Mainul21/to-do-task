document.addEventListener('DOMContentLoaded', () => {
  const FRONTEND_API_BASE = 'http://localhost:4000';

  // --- Auth state ---
  let token = localStorage.getItem('todo_token') || null;
  let currentUser = JSON.parse(localStorage.getItem('todo_user') || 'null');

  // --- Elements ---
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modalContent');
  const openAuth = document.getElementById('openAuth');
  const btnLogout = document.getElementById('btnLogout');
  const toggleDark = document.getElementById('toggleDark');
  const taskForm = document.getElementById('taskForm');
  const titleInput = document.getElementById('title');
  const descInput = document.getElementById('description');
  const dueInput = document.getElementById('dueDate');
  const priorityInput = document.getElementById('priority');
  const tasksList = document.getElementById('tasksList');
  const progressText = document.getElementById('progressText');
  const searchInput = document.getElementById('search');
  const sortSelect = document.getElementById('sort');
  const filterStatus = document.getElementById('filterStatus');
  const clearFormBtn = document.getElementById('clearForm');

  // Check if critical elements exist
  if (!modal || !modalContent) {
    console.error('Modal elements (#modal or #modalContent) not found in DOM.');
    return;
  }

  // --- Utilities ---
  function authHeaders() {
    return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }

  function showModal(html) {
    modalContent.innerHTML = html;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modalContent.innerHTML = '';
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // --- Auth UI ---
  if (openAuth) {
    openAuth.addEventListener('click', () => {
      if (token) {
        alert('Already logged in');
        return;
      }
      showAuthForm();
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      logout();
    });
  }

  function showAuthForm() {
    showModal(`
      <h3 class="text-lg font-bold mb-2">Login / Register</h3>
      <div class="space-y-2">
        <input id="authName" placeholder="Name (for register)" class="w-full border p-2 rounded" />
        <input id="authEmail" placeholder="Email" class="w-full border p-2 rounded" />
        <input id="authPass" type="password" placeholder="Password" class="w-full border p-2 rounded" />
        <select id="authRole" class="w-full border p-2 rounded">
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
        <div class="flex gap-2 mt-2">
          <button id="btnLogin" class="px-3 py-1 bg-blue-600 text-white rounded">Login</button>
          <button id="btnRegister" class="px-3 py-1 border rounded">Register</button>
        </div>
      </div>
    `);

    document.getElementById('btnLogin').addEventListener('click', async () => {
      const email = document.getElementById('authEmail').value;
      const pass = document.getElementById('authPass').value;
      try {
        const res = await fetch(FRONTEND_API_BASE + '/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass })
        });
        const data = await res.json();
        if (res.ok) {
          token = data.token;
          currentUser = data.user;
          localStorage.setItem('todo_token', token);
          localStorage.setItem('todo_user', JSON.stringify(currentUser));
          closeModal();
          refreshUI();
        } else {
          alert(data.error || 'Login failed');
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    });

    document.getElementById('btnRegister').addEventListener('click', async () => {
      const name = document.getElementById('authName').value;
      const email = document.getElementById('authEmail').value;
      const pass = document.getElementById('authPass').value;
      const role = document.getElementById('authRole').value;
      try {
        const res = await fetch(FRONTEND_API_BASE + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password: pass, role })
        });
        const data = await res.json();
        if (res.ok) {
          token = data.token;
          currentUser = data.user;
          localStorage.setItem('todo_token', token);
          localStorage.setItem('todo_user', JSON.stringify(currentUser));
          closeModal();
          refreshUI();
        } else {
          alert(data.error || 'Register failed');
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    });
  }

  // --- Logout ---
  function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('todo_token');
    localStorage.removeItem('todo_user');
    refreshUI();
  }

  // --- Tasks ---
  let tasks = [];
  async function loadTasks() {
    if (!token) {
      tasks = [];
      renderTasks();
      return;
    }
    try {
      const res = await fetch(FRONTEND_API_BASE + '/tasks', { headers: authHeaders() });
      if (res.status === 401) {
        logout();
        return;
      }
      tasks = await res.json();
      renderTasks();
    } catch (e) {
      console.error(e);
      alert('Could not load tasks. Is backend running?');
    }
  }

  function renderTasks() {
    if (!tasksList || !progressText) {
      console.error('Required elements (#tasksList or #progressText) not found.');
      return;
    }

    const q = searchInput?.value.toLowerCase() || '';
    let list = tasks.filter(t => {
      if (filterStatus?.value === 'complete' && !t.completed) return false;
      if (filterStatus?.value === 'incomplete' && t.completed) return false;
      if (q && !(t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))) return false;
      return true;
    });

    // Sorting
    if (sortSelect?.value === 'createdDesc') list.sort((a, b) => b.createdAt - a.createdAt);
    if (sortSelect?.value === 'createdAsc') list.sort((a, b) => a.createdAt - b.createdAt);
    if (sortSelect?.value === 'dueAsc') list.sort((a, b) => (a.dueDate || '9999') > (b.dueDate || '9999') ? 1 : -1);
    if (sortSelect?.value === 'priority') list.sort((a, b) => priorityValue(b.priority) - priorityValue(a.priority));

    // Progress bar
    const completed = tasks.filter(t => t.completed).length;
    const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
    progressText.innerText = percent + '%';

    // Dashboard summary
    const now = new Date();
    const overdue = tasks.filter(t => t.dueDate && !t.completed && new Date(t.dueDate) < now).length;
    const incomplete = tasks.length - completed;

    const totalEl = document.getElementById('totalTasks');
    const completedEl = document.getElementById('completedTasks');
    const incompleteEl = document.getElementById('incompleteTasks');
    const overdueEl = document.getElementById('overdueTasks');

    if (totalEl && completedEl && incompleteEl && overdueEl) {
      totalEl.innerText = tasks.length;
      completedEl.innerText = completed;
      incompleteEl.innerText = incomplete;
      overdueEl.innerText = overdue;
    }

    // Role-based UI
    tasksList.innerHTML = list.map(t => {
      const isManager = currentUser?.role === 'manager';
      return `
        <div class="p-3 border rounded bg-white flex items-start gap-3">
          <input data-id="${t._id}" type="checkbox" ${t.completed ? 'checked' : ''} class="task-complete mt-1" />
          <div class="flex-1">
            <div class="flex justify-between items-start gap-3">
              <div>
                <div class="font-semibold ${t.completed ? 'line-through text-gray-500' : ''}">${escapeHtml(t.title)}</div>
                <div class="text-sm text-gray-600">${escapeHtml(t.description || '')}</div>
                <div class="text-xs text-gray-500 mt-1">Priority: ${t.priority}${t.dueDate ? ' | Due: ' + t.dueDate : ''}</div>
              </div>
              ${isManager ? `
                <div class="flex flex-col gap-2">
                  <button data-id="${t._id}" class="edit-btn px-2 py-1 border rounded text-sm">Edit</button>
                  <button data-id="${t._id}" class="delete-btn px-2 py-1 border rounded text-sm text-red-600">Delete</button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    attachListeners();
  }

  function attachListeners() {
    // Handle task completion toggle
    const taskCompletes = document.querySelectorAll('.task-complete');
    if (taskCompletes.length > 0) {
      taskCompletes.forEach(cb => {
        cb.addEventListener('change', async (e) => {
          const id = e.target.dataset.id;
          try {
            await fetch(FRONTEND_API_BASE + '/tasks/' + id, {
              method: 'PUT',
              headers: authHeaders(),
              body: JSON.stringify({
                completed: e.target.checked
              })
            });
            await loadTasks();
          } catch (err) {
            alert('Error updating task');
          }
        });
      });
    }

    // Manager-only actions
    if (currentUser?.role === 'manager') {
      // Delete task
      const deleteButtons = document.querySelectorAll('.delete-btn');
      if (deleteButtons.length > 0) {
        deleteButtons.forEach(b => {
          b.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            showModal(`
              <h3 class="text-lg font-bold mb-2">Confirm Delete</h3>
              <p class="mb-4">Are you sure you want to delete this task?</p>
              <div class="flex gap-2">
                <button id="confirmDelete" class="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                <button id="cancelDelete" class="px-3 py-1 border rounded">Cancel</button>
              </div>
            `);

            document.getElementById('cancelDelete').addEventListener('click', closeModal);
            document.getElementById('confirmDelete').addEventListener('click', async () => {
              try {
                await fetch(FRONTEND_API_BASE + '/tasks/' + id, {
                  method: 'DELETE',
                  headers: authHeaders()
                });
                closeModal();
                await loadTasks();
              } catch (e) {
                alert('Error deleting task');
              }
            });
          });
        });
      }

      // Edit task
      const editButtons = document.querySelectorAll('.edit-btn');
      if (editButtons.length > 0) {
        editButtons.forEach(b => {
          b.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const t = tasks.find(x => x._id === id);
            if (!t) return alert('Task not found');

            showModal(`
              <h3 class="text-lg font-bold mb-2">Edit Task</h3>
              <div class="space-y-2">
                <input id="editTitle" value="${escapeHtml(t.title)}" class="w-full border p-2 rounded" />
                <input id="editDue" type="date" value="${t.dueDate || ''}" class="w-full border p-2 rounded" />
                <textarea id="editDesc" class="w-full border p-2 rounded">${escapeHtml(t.description || '')}</textarea>
                <select id="editPriority" class="w-full border p-2 rounded">
                  <option ${t.priority === 'High' ? 'selected' : ''}>High</option>
                  <option ${t.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                  <option ${t.priority === 'Low' ? 'selected' : ''}>Low</option>
                </select>
                <div class="flex gap-2 mt-2">
                  <button id="saveEdit" class="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                  <button id="cancelEdit" class="px-3 py-1 border rounded">Cancel</button>
                </div>
              </div>
            `);

            document.getElementById('cancelEdit').addEventListener('click', closeModal);
            document.getElementById('saveEdit').addEventListener('click', async () => {
              const payload = {
                title: document.getElementById('editTitle').value,
                description: document.getElementById('editDesc').value,
                dueDate: document.getElementById('editDue').value || null,
                priority: document.getElementById('editPriority').value
              };
              try {
                await fetch(FRONTEND_API_BASE + '/tasks/' + id, {
                  method: 'PUT',
                  headers: authHeaders(),
                  body: JSON.stringify(payload)
                });
                closeModal();
                await loadTasks();
              } catch (e) {
                alert('Error updating task');
              }
            });
          });
        });
      }
    }
  }

  function escapeHtml(s) {
    return (s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function priorityValue(p) {
    return p === 'High' ? 3 : (p === 'Medium' ? 2 : 1);
  }

  // --- Form submit ---
  if (taskForm && titleInput && descInput && dueInput && priorityInput) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!token) {
        alert('Please login/register first');
        showAuthForm();
        return;
      }
      const payload = {
        title: titleInput.value,
        description: descInput.value,
        dueDate: dueInput.value || null,
        priority: priorityInput.value
        // Note: assignedTo commented out as no element exists
        // assignedTo: document.getElementById('assignedTo').value
      };
      try {
        await fetch(FRONTEND_API_BASE + '/tasks', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });
        titleInput.value = '';
        descInput.value = '';
        dueInput.value = '';
        priorityInput.value = 'Medium';
        await loadTasks();
      } catch (e) {
        alert('Error adding task');
      }
    });
  }

  if (clearFormBtn && titleInput && descInput && dueInput && priorityInput) {
    clearFormBtn.addEventListener('click', () => {
      titleInput.value = '';
      descInput.value = '';
      dueInput.value = '';
      priorityInput.value = 'Medium';
    });
  }

  // Filters & search listeners
  if (searchInput) searchInput.addEventListener('input', renderTasks);
  if (sortSelect) sortSelect.addEventListener('change', renderTasks);
  if (filterStatus) filterStatus.addEventListener('change', renderTasks);

  // Dark mode toggle
  if (toggleDark) {
    toggleDark.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      document.body.classList.toggle('bg-gray-900');
      document.body.classList.toggle('text-white');
    });
  }

  // Refresh UI based on auth
  function refreshUI() {
    if (token && currentUser) {
      if (openAuth) openAuth.classList.add('hidden');
      if (btnLogout) btnLogout.classList.remove('hidden');
      if (taskForm) taskForm.classList.remove('hidden');
      if (clearFormBtn) clearFormBtn.classList.remove('hidden');
    } else {
      if (openAuth) openAuth.classList.remove('hidden');
      if (btnLogout) btnLogout.classList.add('hidden');
      if (taskForm) taskForm.classList.add('hidden');
      if (clearFormBtn) clearFormBtn.classList.add('hidden');
    }

    loadTasks();
  }

  // Initial
  refreshUI();
});