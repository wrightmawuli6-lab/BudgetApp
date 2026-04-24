# Student Budgeting Companion App

Production-ready full-stack budgeting platform for students with modular backend architecture, JWT auth, analytics engines, and AI-powered coaching.

## Tech Stack

- Frontend: React + TypeScript + Axios (existing Vite app)
- Backend: Node.js + Express + PostgreSQL
- Auth: JWT + bcrypt
- Architecture: MVC + service layer + validation middleware
- Scheduling: node-cron daily reminder job (8 PM)
- AI: Isolated `/services/aiFinancialService.js` module

## Folder Structure

```text
Budgeting_app/
+- backend/
¦  +- db/
¦  ¦  +- schema.sql
¦  +- src/
¦  ¦  +- app.js
¦  ¦  +- server.js
¦  ¦  +- config/
¦  ¦  ¦  +- db.js
¦  ¦  ¦  +- env.js
¦  ¦  +- constants/
¦  ¦  ¦  +- expenseCategories.js
¦  ¦  +- controllers/
¦  ¦  ¦  +- aiController.js
¦  ¦  ¦  +- authController.js
¦  ¦  ¦  +- budgetController.js
¦  ¦  ¦  +- dashboardController.js
¦  ¦  ¦  +- expenseController.js
¦  ¦  ¦  +- incomeController.js
¦  ¦  ¦  +- notificationController.js
¦  ¦  ¦  +- profileController.js
¦  ¦  ¦  +- savingsGoalController.js
¦  ¦  ¦  +- trendController.js
¦  ¦  +- jobs/
¦  ¦  ¦  +- reminderJob.js
¦  ¦  +- middlewares/
¦  ¦  ¦  +- authMiddleware.js
¦  ¦  ¦  +- errorMiddleware.js
¦  ¦  ¦  +- validateMiddleware.js
¦  ¦  +- routes/
¦  ¦  ¦  +- aiRoutes.js
¦  ¦  ¦  +- authRoutes.js
¦  ¦  ¦  +- budgetRoutes.js
¦  ¦  ¦  +- dashboardRoutes.js
¦  ¦  ¦  +- expenseRoutes.js
¦  ¦  ¦  +- incomeRoutes.js
¦  ¦  ¦  +- notificationRoutes.js
¦  ¦  ¦  +- profileRoutes.js
¦  ¦  ¦  +- savingsGoalRoutes.js
¦  ¦  ¦  +- trendRoutes.js
¦  ¦  +- services/
¦  ¦  ¦  +- aiFinancialService.js
¦  ¦  ¦  +- authService.js
¦  ¦  ¦  +- budgetComparisonService.js
¦  ¦  ¦  +- dashboardService.js
¦  ¦  ¦  +- expenseService.js
¦  ¦  ¦  +- financialHealthService.js
¦  ¦  ¦  +- financialInsightService.js
¦  ¦  ¦  +- incomeService.js
¦  ¦  ¦  +- notificationService.js
¦  ¦  ¦  +- profileService.js
¦  ¦  ¦  +- reminderService.js
¦  ¦  ¦  +- savingsGoalService.js
¦  ¦  ¦  +- simulationService.js
¦  ¦  ¦  +- trendService.js
¦  ¦  +- utils/
¦  ¦  ¦  +- ApiError.js
¦  ¦  ¦  +- asyncHandler.js
¦  ¦  ¦  +- dateUtils.js
¦  ¦  ¦  +- mathUtils.js
¦  ¦  +- validators/
¦  ¦     +- aiValidators.js
¦  ¦     +- authValidators.js
¦  ¦     +- expenseValidators.js
¦  ¦     +- incomeValidators.js
¦  ¦     +- profileValidators.js
¦  ¦     +- savingsValidators.js
¦  +- .env.example
¦  +- package.json
+- components/
¦  +- SampleDashboard.tsx
+- services/
¦  +- apiClient.ts
¦  +- dashboardApi.ts
¦  +- aiService.ts
¦  +- storageService.ts
+- auth.ts
+- index.tsx
+- ...existing frontend files
```

## Database Schema

Use `backend/db/schema.sql`.

Includes:
- `users`
- `profiles`
- `incomes`
- `expenses`
- `savings_goals`
- `financial_insights`
- `spending_trends`
- `simulations`
- `notification_events`

Phase 2 required tables are implemented: `financial_insights`, `spending_trends`, `simulations`.

## Backend Setup

1. Open backend folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Configure env:

```bash
cp .env.example .env
```

4. Create PostgreSQL database and run schema:

```bash
psql -U postgres -d student_budgeting -f db/schema.sql
```

5. Start backend:

```bash
npm run dev
```

Backend runs at `http://localhost:4000` by default.

## Frontend Setup

1. In project root install deps:

```bash
npm install
```

2. Optional frontend env (`.env.local`):

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

3. Run frontend:

```bash
npm run dev
```

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Profile
- `GET /api/profile`
- `PUT /api/profile`

### Income
- `POST /api/income`
- `GET /api/income?month=YYYY-MM`
- `PUT /api/income/:id`
- `DELETE /api/income/:id`
- `GET /api/income/summary/monthly?month=YYYY-MM`

### Expenses
- `POST /api/expenses`
- `GET /api/expenses?month=YYYY-MM`
- `PUT /api/expenses/:id`
- `DELETE /api/expenses/:id`
- `GET /api/expenses/summary/category?month=YYYY-MM`

### Savings Goal
- `GET /api/savings-goal`
- `PUT /api/savings-goal`

### Dashboard
- `GET /api/dashboard?month=YYYY-MM`

### AI + Analytics
- `POST /api/ai/analyze`
- `GET /api/trends`
- `GET /api/budget/compare?month1=YYYY-MM&month2=YYYY-MM`
- `POST /api/budget/simulate`

### Notifications
- `GET /api/notifications`

## Example API Responses

### Dashboard (`GET /api/dashboard`)

```json
{
  "month": "2026-02",
  "total_income": 1600,
  "total_expenses": 1180,
  "balance": 420,
  "savings_progress": {
    "current_progress_percent": 36,
    "remaining_amount": 640
  },
  "expense_breakdown_by_category": {
    "Food": 280,
    "Rent": 600,
    "Transport": 150,
    "Entertainment": 150
  },
  "current_budget_status": "on_track"
}
```

### AI Analysis (`POST /api/ai/analyze`)

```json
{
  "spending_pattern_analysis": "Your largest spending category is Rent, consuming 51% of total expenses.",
  "financial_health_score": 74,
  "goal_feasibility": "feasible",
  "recommended_budget_model": "50/30/20",
  "habit_warnings": ["Savings rate is below 10% of income."],
  "improvement_suggestions": [
    "Cap variable spending categories weekly.",
    "Automate savings transfer on income day.",
    "Track expenses daily to avoid backlog and blind spots."
  ],
  "personalized_review_questions": [
    "Which non-essential expense can you reduce by 10% this week?",
    "Can you add one extra income source this month?",
    "Are current savings goals aligned with your cash flow?"
  ],
  "motivational_message": "You are on a realistic path. Keep consistency high."
}
```

### Trends (`GET /api/trends`)

```json
{
  "weekly_trend": { "average": 310.5, "latest": 355, "previous": 320 },
  "monthly_trend": { "average": 1120.25, "latest": 1180, "previous": 1060 },
  "highest_growth_category": "Entertainment",
  "spending_spike_detected": true,
  "overspending_categories": ["Entertainment"],
  "increasing_debt_risk": false,
  "decreasing_savings_rate": true
}
```

### Budget Compare (`GET /api/budget/compare`)

```json
{
  "month1": "2026-01",
  "month2": "2026-02",
  "income_difference": 200,
  "expense_difference": 120,
  "savings_difference": 80,
  "category_changes": [
    { "category": "Food", "month1": 220, "month2": 280, "difference": 60 }
  ],
  "improvement_or_decline": "improved"
}
```

### Simulation (`POST /api/budget/simulate`)

```json
{
  "new_balance_projection": 500,
  "months_to_reach_goal": 4,
  "risk_level": "low",
  "simulation_summary": "At projected net savings of 500.00 per month, you can reach the goal in 4 month(s)."
}
```

## Frontend API Integration

### Axios client
- `services/apiClient.ts`
- Adds `Authorization: Bearer <token>` automatically from localStorage.

### Auth integration
- `auth.ts` now uses backend endpoints and stores JWT/session.
- Existing `Login`, `Register`, and `ProtectedRoute` now work with backend auth.

### Sample dashboard component
- `components/SampleDashboard.tsx`
- Route: `/#/sample-dashboard`
- Includes AI call using:

```ts
const insight = await getAiFinancialAnalysis();
```

## Production Engineering Notes

- No business logic in routes
- Controllers handle request/response only
- Domain logic isolated in services
- AI module isolated in `aiFinancialService.js`
- Input validation via Zod middleware
- Centralized error handling
- Environment-driven configuration
- Cron reminder scheduler at 8 PM daily

## Quick Verification Checklist

- Register/login returns JWT
- Protected endpoints reject missing/invalid JWT
- CRUD income/expenses works per authenticated user
- Dashboard totals match monthly records
- `/api/ai/analyze` persists `financial_insights`
- `/api/trends` persists `spending_trends`
- `/api/budget/simulate` persists `simulations`
- Reminder cron inserts `notification_events` for users with no same-day expense entries