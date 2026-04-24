import { query } from "../config/db.js";

export async function logAdminAudit({
  actorAdminId = null,
  action,
  entityType,
  entityId = null,
  metadata = {},
  ip = null
}) {
  await query(
    `INSERT INTO audit_logs (actor_admin_id, action, entity_type, entity_id, metadata_json, ip)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [actorAdminId, action, entityType, entityId, JSON.stringify(metadata ?? {}), ip]
  );
}
