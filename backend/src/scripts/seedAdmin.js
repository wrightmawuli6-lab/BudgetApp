import { withTransaction, pool } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import {
  ADMIN_PERMISSION_DESCRIPTIONS,
  ADMIN_PERMISSION_KEYS,
  SUPER_ADMIN_ROLE
} from "../constants/adminPermissions.js";
import { hashAdminPassword } from "../services/adminAuthService.js";

async function upsertPermissions(client) {
  for (const key of ADMIN_PERMISSION_KEYS) {
    await client.query(
      `INSERT INTO permissions (key, description)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description`,
      [key, ADMIN_PERMISSION_DESCRIPTIONS[key] || ""]
    );
  }
}

async function upsertSuperAdminRole(client) {
  const roleResult = await client.query(
    `INSERT INTO roles (name, description, is_system)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (name) DO UPDATE SET
       description = EXCLUDED.description,
       is_system = TRUE
     RETURNING id`,
    [SUPER_ADMIN_ROLE, "System role with unrestricted access to admin APIs"]
  );
  return roleResult.rows[0].id;
}

async function assignAllPermissionsToRole(client, roleId) {
  const permissions = await client.query("SELECT id FROM permissions");
  for (const row of permissions.rows) {
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2)
       ON CONFLICT (role_id, permission_id) DO NOTHING`,
      [roleId, row.id]
    );
  }
}

async function upsertSuperAdminUser(client) {
  const email = process.env.ADMIN_SUPER_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SUPER_PASSWORD;
  const name = process.env.ADMIN_SUPER_NAME?.trim() || "Super Admin";

  if (!email || !password) {
    throw new ApiError(400, "ADMIN_SUPER_EMAIL and ADMIN_SUPER_PASSWORD are required");
  }

  const passwordHash = await hashAdminPassword(password);
  const result = await client.query(
    `INSERT INTO admin_users (email, name, password_hash, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       password_hash = EXCLUDED.password_hash,
       is_active = TRUE,
       updated_at = NOW()
     RETURNING id, email`,
    [email, name, passwordHash]
  );
  return result.rows[0];
}

async function assignRoleToAdmin(client, adminId, roleId) {
  await client.query(
    `INSERT INTO admin_user_roles (admin_user_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT (admin_user_id, role_id) DO NOTHING`,
    [adminId, roleId]
  );
}

async function seedAdmin() {
  await withTransaction(async (client) => {
    await upsertPermissions(client);
    const superAdminRoleId = await upsertSuperAdminRole(client);
    await assignAllPermissionsToRole(client, superAdminRoleId);
    const adminUser = await upsertSuperAdminUser(client);
    await assignRoleToAdmin(client, adminUser.id, superAdminRoleId);
  });
}

seedAdmin()
  .then(async () => {
    console.log("Admin seed completed successfully.");
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Admin seed failed:", error.message);
    await pool.end();
    process.exit(1);
  });
