# Connection Fix Guide - Backend & Frontend Setup

## ✅ What Was Fixed

1. **Port Mismatch**: Backend was set to port `4001`, frontend expected `4000` → **Fixed to 4000**
2. **CORS Configuration**: Only allowed `localhost:3000` → **Now allows localhost:5173 (Vite) and localhost:3000**
3. **Error Logging**: Added detailed error messages to help diagnose connection issues
4. **Health Checks**: Added backend health verification endpoints

---

## 🚀 How to Run the App

### Step 1: Start the Backend Server

```powershell
# Navigate to backend folder
cd Budgeting_app/backend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
Backend listening on port 4000
```

### Step 2: Start the Frontend Dev Server

**In a NEW terminal window:**

```powershell
# Navigate to frontend folder
cd Budgeting_app

# Install dependencies (first time only)
npm install

# Start Vite development server
npm run dev
```

**Expected Output:**
```
  VITE v6.2.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 3: Test the Connection

#### Option A: Backend Health Check (Browser)

Open your browser and go to:

```
http://localhost:4000/
```

**Expected Result:**
```json
{
  "status": "Backend is running",
  "port": 4000,
  "timestamp": "2026-04-14T..."
}
```

If you see this, backend is running correctly ✅

#### Option B: Check Browser Console (App Running)

1. Open http://localhost:5173 in your browser
2. Open Developer Console (F12 or Cmd+Option+I)
3. Look for these log messages:

**Good signs:**
```
[API] Configured base URL: http://localhost:4000
[API] Configured API root: http://localhost:4000/api
[API] Backend health check passed: ...
[API] GET /api/profile
[API] Success: 200 /api/profile
```

**Bad signs:**
```
[API] Connection refused. Is backend running at http://localhost:4000?
[API] Backend health check failed.
```

---

## 🔍 Troubleshooting

### Issue: Still Getting ERR_CONNECTION_REFUSED

**Check 1: Is backend running?**
```powershell
# In backend folder
npm run dev
# Should show: "Backend listening on port 4000"
```

**Check 2: Is the port correct?**
```powershell
# Verify backend is on port 4000
cat Budgeting_app/backend/.env
# Should show: PORT=4000
```

**Check 3: Check for port conflicts**

Windows:
```powershell
netstat -ano | findstr :4000
# If something shows, kill it:
# taskkill /PID <PID> /F
```

Mac/Linux:
```bash
lsof -i :4000
# If something shows, kill it:
# kill -9 <PID>
```

**Check 4: Check frontend environment**
```
cat Budgeting_app/.env.local
# Should show: VITE_API_BASE_URL=http://localhost:4000
```

### Issue: CORS Error

**Check the backend .env:**
```
CLIENT_ORIGIN=http://localhost:5173,http://localhost:3000
```

It should list both URLs. If not, update it and restart the backend.

### Issue: Database Connection Error

**Check 1: Is PostgreSQL running?**
```
psql -U postgres
```

**Check 2: Does database exist?**
```sql
\l
-- Should see: budgeting_app
```

**Check 3: Is connection string correct?**
```
DATABASE_URL=postgresql://postgres:1234@localhost:5432/budgeting_app
```

---

## 📊 API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Backend health (simple test) |
| GET | `/health` | Backend health check |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| GET | `/api/profile` | Get user profile |
| GET | `/api/expenses` | Get expenses |
| POST | `/api/expenses` | Add expense |
| GET | `/api/income` | Get income entries |
| POST | `/api/income` | Add income |
| GET | `/api/savings-goal` | Get savings goals |

---

## 🛠️ Configuration Files

### Backend `.env` (located at `Budgeting_app/backend/.env`)

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:1234@localhost:5432/budgeting_app
JWT_SECRET=dev_super_secret_change_me_2026
CLIENT_ORIGIN=http://localhost:5173,http://localhost:3000
OPENAI_API_KEY=
```

### Frontend `.env.local` (located at `Budgeting_app/.env.local`)

```env
GEMINI_API_KEY=PLACEHOLDER_API_KEY
VITE_API_BASE_URL=http://localhost:4000
```

---

## ✨ Success Indicators

When everything is working:

1. ✅ Backend responds to `http://localhost:4000/`
2. ✅ Frontend loads at `http://localhost:5173/`
3. ✅ Console shows `[API] Backend health check passed:`
4. ✅ Can sign up and log in
5. ✅ Can add expenses and income
6. ✅ Dashboard data loads without errors

---

## 🆘 Still Having Issues?

1. **Restart Everything**
   - Kill both terminals (Ctrl+C)
   - Kill any Node processes: `taskkill /F /IM node.exe`
   - Start fresh: backend first, then frontend

2. **Check Console Logs**
   - Backend terminal: look for error messages
   - Browser console (F12): look for [API] error messages

3. **Clear Browser Cache**
   - Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   - Clear cookies and cache
   - Reload the page

---

## 📝 Notes

- Backend must run on port 4000 for frontend to connect
- Frontend dev server (Vite) runs on port 5173 by default
- CORS is already configured to allow localhost connections
- Database must be running (PostgreSQL)
- Check browser console (F12) for helpful [API] log messages
