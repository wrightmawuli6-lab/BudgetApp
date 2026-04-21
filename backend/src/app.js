import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { notFoundMiddleware, errorMiddleware } from "./middlewares/errorMiddleware.js";
import { authRoutes } from "./routes/authRoutes.js";
import { profileRoutes } from "./routes/profileRoutes.js";
import { incomeRoutes } from "./routes/incomeRoutes.js";
import { expenseRoutes } from "./routes/expenseRoutes.js";
import { savingsGoalRoutes } from "./routes/savingsGoalRoutes.js";
import { dashboardRoutes } from "./routes/dashboardRoutes.js";
import { aiRoutes } from "./routes/aiRoutes.js";
import { goalsRoutes } from "./routes/goalsRoutes.js";
import { strategyRoutes } from "./routes/strategyRoutes.js";
import { trendRoutes } from "./routes/trendRoutes.js";
import { budgetRoutes } from "./routes/budgetRoutes.js";
import { notificationRoutes } from "./routes/notificationRoutes.js";
import { adminAuthRoutes } from "./routes/adminAuthRoutes.js";
import { adminUsersRoutes } from "./routes/adminUsersRoutes.js";
import { adminRolesRoutes } from "./routes/adminRolesRoutes.js";
import { adminAuditRoutes } from "./routes/adminAuditRoutes.js";

export const app = express();

app.use(helmet());

const corsOriginHandler = (origin, callback) => {
  if (!origin) {
    return callback(null, true);
  }

  if (env.nodeEnv !== "production") {
    return callback(null, true);
  }

  if (env.clientOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error("CORS origin not allowed"));
};

app.use(
  cors({
    origin: corsOriginHandler,
    credentials: false
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/savings-goal", savingsGoalRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/strategies", strategyRoutes);
app.use("/api/trends", trendRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/admin/api/auth", adminAuthRoutes);
app.use("/admin/api/users", adminUsersRoutes);
app.use("/admin/api/roles", adminRolesRoutes);
app.use("/admin/api/audit-logs", adminAuditRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
