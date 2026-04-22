# Hostel Management System

Full-stack Hostel Management project with:
- `backend`: Node.js + Express + MongoDB API
- `frontend`: React + Vite dashboard

## One-Command Run (Root)
From project root:
```bash
npm install
npm run install:all
npm run dev
```

This starts both backend and frontend together.

## Execution Video
- https://drive.google.com/file/d/1IetVpYlBvlU8VPSy7Yr2SI1Rk-bMhvMp/view?usp=sharing

## Features
- Authentication (login/register)
- Role-based access (`Student`, `Warden`)
- User management
- Room creation and student allocation/deallocation
- Attendance tracking
- Complaint registration and status workflow
- Leave request workflow (student request, warden approve/reject)
- Notice board with priority, targeting, publish/expiry windows

## Project Structure
```txt
HOSTEL_MANAGEMENT/
  backend/
    src/
  frontend/
    src/
```

## Backend Setup
1. Open backend folder:
```bash
cd backend
```
2. Install packages:
```bash
npm install
```
3. Create env file:
```bash
copy .env.example .env
```
4. Update `.env`:
- `MONGO_URI`
- `JWT_SECRET`
- `PORT` (optional, default `5000`)
- `CLIENT_URL` (optional, default `http://localhost:5173`)

5. Start backend:
```bash
npm run dev
```

## Frontend Setup (React)
1. Open frontend folder:
```bash
cd frontend
```
2. Install packages:
```bash
npm install
```
3. Start frontend:
```bash
npm run dev
```

Frontend default URL: `http://localhost:5173`  
Backend default URL: `http://localhost:5000`

## API Base for Frontend
- In development, Vite proxy forwards `/api/*` to backend automatically.
- Optional env override in frontend:
```bash
VITE_API_BASE_URL=http://localhost:5000
```

## Main API Endpoints
- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/profile`
- `GET/POST/PUT/DELETE /api/users`
- `GET/POST/PUT/DELETE /api/rooms`
- `POST /api/rooms/:id/allocate`
- `POST /api/rooms/:id/deallocate`
- `GET/POST/PUT/DELETE /api/attendance`
- `GET/POST/PUT/DELETE /api/complaints`
- `GET/POST/PUT/DELETE /api/leaves`
- `GET/POST/PUT/DELETE /api/notices`
