import { query } from "../config/db.js";

export async function getAdminPermissionContext(adminUserId) {
  const result = await query(
    `SELECT r.name AS role_name, p.key AS permission_key
       FROM admin_users au
       LEFT JOIN admin_user_roles aur ON aur.admin_user_id = au.id
       LEFT JOIN roles r ON r.id = aur.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE au.id = $1`,
    [adminUserId]
  );

  const roles = new Set();
  const permissions = new Set();

  for (const row of result.rows) {
    if (row.role_name) {
      roles.add(row.role_name);
    }
    if (row.permission_key) {
      permissions.add(row.permission_key);
    }
  }

  return {
    roles: Array.from(roles),
    permissions: Array.from(permissions)
  };
}
