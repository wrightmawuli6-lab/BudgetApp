import { listNotifications } from "../services/notificationService.js";

export async function listNotificationsController(req, res) {
  const limit = Number(req.query.limit || 20);
  const data = await listNotifications(req.user.id, limit);
  res.json(data);
}