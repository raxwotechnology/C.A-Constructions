# Raxwo Portal

A full-stack MERN HRM + Corporate Website for Raxwo Pvt Ltd.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + Recharts + Framer Motion
- **Backend**: Node.js + Express + MongoDB + Mongoose
- **Auth**: JWT + bcrypt with RBAC
- **Payments**: PayHere gateway integration

## Project Structure
```
raxwo-portal/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/   # admin/, employee/, client/, public/, auth/
│       ├── layouts/ # PublicLayout, DashboardLayout
│       ├── store/   # Zustand auth store
│       └── lib/     # Axios API instance
└── server/          # Express backend
    └── src/
        ├── models/      # Mongoose schemas
        ├── controllers/ # Business logic
        ├── routes/      # API routes
        └── middleware/  # Auth, upload, error handling
```

## Setup & Run

### 1. Install dependencies
```bash
# Server
cd server && npm install --legacy-peer-deps

# Client
cd client && npm install
```

### 2. Configure environment
Edit `server/.env` with your:
- MongoDB URI
- JWT secret
- PayHere credentials (merchant ID + secret)
- Cloudinary (optional)
- SMTP credentials

### 3. Seed database
```bash
cd server && npm run seed
```

### 4. Run development servers
```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

## Demo Credentials
| Role     | Email                  | Password      |
|----------|------------------------|---------------|
| Admin    | admin@raxwo.com        | Admin@2026    |
| Manager  | manager@raxwo.com      | Manager@2026  |
| Employee | john@raxwo.com         | Employee@2026 |
| Client   | client@techcorp.lk     | Client@2026   |

## API Overview
- `POST /api/auth/login` — Login
- `GET /api/employees` — Employee list
- `POST /api/payroll/generate-all` — Bulk payroll
- `GET /api/payroll/epf-summary` — EPF/ETF report
- `POST /api/recruitment/apply/:jobId` — Apply for job
- `POST /api/letters/generate` — Generate letter
- `POST /api/payments/payhere/init` — Initiate PayHere payment

## EPF/ETF Rates (Sri Lanka)
- Employee EPF: **8%**
- Employer EPF: **12%**
- Employer ETF: **3%**
