import cron from "node-cron";
import { env } from "../config/env.js";
import { runDailyReminderCheck } from "../services/reminderService.js";

export function startReminderJob() {
  cron.schedule(
    "0 20 * * *",
    async () => {
      try {
        const notifications = await runDailyReminderCheck();
        if (notifications.length > 0) {
          console.log(`Reminder job generated ${notifications.length} notifications`);
        }
      } catch (error) {
        console.error("Reminder job failed", error);
      }
    },
    {
      timezone: env.cronTimezone
    }
  );
}