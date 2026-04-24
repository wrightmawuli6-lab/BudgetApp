import { query } from "../config/db.js";

export async function listAuditLogs(limit = 100) {
  const result = await query(
    `SELECT al.id, al.actor_admin_id, au.email AS actor_email, al.action, al.entity_type, al.entity_id,
            al.metadata_json, al.ip, al.created_at
       FROM audit_logs al
       LEFT JOIN admin_users au ON au.id = al.actor_admin_id
      ORDER BY al.created_at DESC
      LIMIT $1`,
    [limit]
  );

  return result.rows;
}
