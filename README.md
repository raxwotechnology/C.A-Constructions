# Raxwo Technologies — Business Management System (MERN Stack)

A full-stack MERN application for managing employees, projects, attendance, payroll, appointments, financials, products, and social media.

---

## 🔑 Default Credentials

### Admin / Staff Login → http://localhost:5173/login
| Role | Phone | Password |
|---|---|---|
| **Admin** | `03001234567` | `admin123` |

> To add developers/managers/designers, login as Admin and use the **Employees** section.

### Customer Login → http://localhost:5173/customer/login
> Customers register at `/register` using phone + password.

---

## 🚀 Quick Start

### 1. Start Backend (Express + MongoDB)
```bash
cd server
npm run dev        # starts on http://localhost:5000
```

### 2. Start Frontend (React + Vite)
```bash
cd client
npm run dev        # starts on http://localhost:5173
```

### 3. Start AI Microservice (Python Flask) — Optional
```bash
cd python-service
pip install -r requirements.txt
python app.py      # starts on http://localhost:5001
```

### Or run both together from root:
```bash
npm run dev        # runs server + client concurrently
```

---

## 📁 Project Structure

```
raxwo-mern/
├── server/                  ← Express.js REST API
│   ├── src/
│   │   ├── controllers/     ← Business logic (10 controllers)
│   │   ├── models/          ← Mongoose schemas (8 models)
│   │   ├── routes/          ← API routes (13 route files)
│   │   └── middleware/      ← JWT auth + file upload
│   ├── uploads/             ← Uploaded files (auto-created)
│   ├── seed.js              ← Database seeder
│   └── .env                 ← Environment variables
│
├── client/                  ← React 19 + Vite 8 + Tailwind 3
│   └── src/
│       ├── pages/admin/     ← Dashboard, Employees, Projects, etc.
│       ├── pages/customer/  ← Customer self-service portal
│       ├── pages/auth/      ← Login, Register
│       ├── components/      ← Layout (Sidebar, Header) + UI components
│       ├── context/         ← AuthContext (JWT + role management)
│       └── api/             ← Axios instance + all API functions
│
└── python-service/          ← Flask AI microservice
    └── app.py               ← Project predictor + analytics endpoints
```

---

## 🎨 Design System
- **Colors**: Navy `#080344` + Purple `#534AB7`
- **Font**: Poppins (Google Fonts)
- **Charts**: Recharts (Area, Bar, Radar, Line)
- **Animations**: Framer Motion

## 🛡️ API Endpoints
- `POST /api/auth/login` — Login
- `GET  /api/employees?type=developer` — List employees
- `GET  /api/projects` — List projects
- `POST /api/attendance/clock-in` — Clock in
- `GET  /api/analytics/dashboard` — Dashboard stats
- ...see `/src/routes/` for all endpoints

---

*© 2025 Raxwo (Pvt) Ltd. All rights reserved.*
