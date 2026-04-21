import { listAuditLogs } from "../services/adminAuditLogService.js";

export async function listAuditLogsController(req, res) {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const logs = await listAuditLogs(limit);
  res.status(200).json({ logs });
}
