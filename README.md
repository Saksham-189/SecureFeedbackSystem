# Secure Online Feedback System

A production-grade, enterprise-ready, zero-trust anonymous feedback management platform. Built to handle sensitive institutional surveys while strictly enforcing data privacy, role-based access control, and cryptographic anonymity guarantees.

## Features

- **Dynamic Form Engine**: Create complex forms with MCQs, checkboxes, ratings, and text fields.
- **Strict Anonymity (Zero-Trust)**: Uses K-anonymity thresholds and cryptographic metadata hashing to prevent deanonymization. Text responses are encrypted at rest (AES-256-GCM).
- **Anti-Abuse & Integrity**: Heuristic monitoring to detect bots, duplicate fingerprinting, and rapid submission anomalies without logging identifying data.
- **Enterprise RBAC**: Hardened permissions with role boundaries (Student, Faculty, Admin, Super Admin).
- **Security Operations Dashboard (SOC)**: Immutable audit trails for admin actions and real-time threat monitoring.
- **Privacy-Safe Analytics**: Automatically randomizes text responses and aggregates metrics safely for faculty viewing.

## Architecture

- **Frontend**: React (Vite), Tailwind CSS, React Router, Axios.
- **Backend**: Node.js, Express, Prisma (PostgreSQL), Zod validation.
- **Security Middleware**: Helmet, CSRF, Rate Limiting, HTTP-only Secure Cookies, CORS.

---

## 🚀 Quick Start / Local Development

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL

### 2. Clone & Install
```bash
git clone https://github.com/your-org/secure-feedback-system.git
cd secure-feedback-system

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 3. Environment Variables
Copy the `.env.example` files to `.env` in both directories.

**Backend (`backend/.env`)**
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/secure_feedback"
JWT_SECRET=generate_a_secure_random_string_here
FIELD_ENCRYPTION_KEY=1234567890123456789012345678901234567890123456789012345678901234
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**Frontend (`frontend/.env`)**
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Database Setup
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```
*(The seed script will provision the initial roles and a default admin account).*

### 5. Run the Application
Start the backend:
```bash
cd backend
npm run dev
```

Start the frontend:
```bash
cd frontend
npm run dev
```

---

## 🚢 Production Deployment

### Backend (Node.js/Express)
1. Ensure `NODE_ENV=production`.
2. Generate a strong, highly secure `32-byte hex` string for `FIELD_ENCRYPTION_KEY` and never expose it.
3. Configure `FRONTEND_URL` to match your actual deployed frontend domain for CORS.
4. Run `npx prisma migrate deploy` during the build step.
5. Start the server using `npm start` (or a process manager like PM2).

### Frontend (React/Vite)
1. Set the `VITE_API_URL` environment variable to your production backend API.
2. Build the optimized bundle:
   ```bash
   npm run build
   ```
3. Host the generated `dist/` directory on Vercel, Netlify, Render, or any static hosting service.

---

## 🛡️ Security Notes
- **HTTPS Only**: In production, ensure the backend is served over HTTPS. Secure cookies will be dropped by browsers if served over plain HTTP.
- **Audit Logs**: Do not purge the `AuditLog` table manually; rely on automated rolling backups if database size becomes an issue.
- **Key Rotation**: If `FIELD_ENCRYPTION_KEY` is compromised, existing text responses will become unreadable if the key is changed without a decryption-reencryption script. Protect this key at all costs.
