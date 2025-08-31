# To-Do List Project (Full Stack)
This project is a complete To-Do List application (frontend + backend) packed ready-to-run.

## Features included
✅ Basic Features (must-have)
- Add Task (title, description)
- View Task List
- Edit Task
- Delete Task
- Mark as Complete/Incomplete

⚡ Intermediate Features
- Due Dates / Deadlines
- Priority Levels (High, Medium, Low)
- Categories / Tags
- Search & Filter (by name, tag, status)
- Sort Tasks (deadline, priority, created time)
- Progress Tracker (percentage completed)

🌟 Advanced / Bonus
- User Authentication (Register & Login using JWT)
- Dark/Light Mode toggle (frontend)
- Reminders: placeholder (frontend shows upcoming deadlines)

## Stack
- Frontend: Single-page HTML + Tailwind CDN + Vanilla JS (keeps it simple & portable)
- Backend: Node.js + Express + lowdb (file-based JSON DB). Optional MongoDB not required.

## Quick start (backend)
1. Install Node.js (v16+ recommended)
2. Open terminal in `backend` folder
```bash
npm install
# create .env from example and set JWT_SECRET (or leave default for testing)
cp .env.example .env
# start server
npm run dev
```
Backend will run at `http://localhost:4000` by default.

## Quick start (frontend)
Open `frontend/index.html` in a browser. The frontend expects backend at `http://localhost:4000` by default.
If you use a different host/port, update `FRONTEND_API_BASE` variable at top of `frontend/app.js`.

## Notes
- Data is stored in `backend/db.json` using lowdb. This is fine for development and assignments.
- For production, replace lowdb with MongoDB or other DB.
- JWT secret is in `.env`. For real projects, keep secrets secure.

Enjoy — send me any fixes or feature requests and I'll update the project.