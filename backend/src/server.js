import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";
import { startReminderJob } from "./jobs/reminderJob.js";

const server = app.listen(env.port, () => {
  console.log(`Backend listening on port ${env.port}`);
  startReminderJob();
});

const shutdown = async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);