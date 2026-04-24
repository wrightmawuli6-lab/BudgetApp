import { query, withTransaction } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

export async function listRoles() {
  const rolesResult = await query(
    `SELECT r.id, r.name, r.description, r.is_system, r.created_at,
            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object('id', p.id, 'key', p.key, 'description', p.description)
              ) FILTER (WHERE p.id IS NOT NULL),
              '[]'::json
            ) AS permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
      GROUP BY r.id
      ORDER BY r.name ASC`
  );

  const permissionsResult = await query(
    `SELECT id, key, description
       FROM permissions
      ORDER BY key ASC`
  );

  return {
    roles: rolesResult.rows,
    permissions: permissionsResult.rows
  };
}

export async function createRole(payload) {
  const name = payload.name.trim().toUpperCase().replace(/\s+/g, "_");
  const result = await query(
    `INSERT INTO roles (name, description, is_system)
     VALUES ($1, $2, FALSE)
     ON CONFLICT (name) DO NOTHING
     RETURNING id, name, description, is_system, created_at`,
    [name, payload.description?.trim() || ""]
  );

  const role = result.rows[0];
  if (!role) {
    throw new ApiError(409, "Role already exists");
  }

  return role;
}

export async function assignPermissionsToRole(roleId, permissionIds) {
  return withTransaction(async (client) => {
    const roleResult = await client.query("SELECT id, is_system FROM roles WHERE id = $1", [roleId]);
    const role = roleResult.rows[0];
    if (!role) {
      throw new ApiError(404, "Role not found");
    }

    const permissionResult = await client.query("SELECT id FROM permissions WHERE id = ANY($1::uuid[])", [
      permissionIds
    ]);
    if (permissionResult.rowCount !== permissionIds.length) {
      throw new ApiError(400, "One or more permission IDs are invalid");
    }

    await client.query("DELETE FROM role_permissions WHERE role_id = $1", [roleId]);
    for (const permissionId of permissionIds) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [roleId, permissionId]
      );
    }

    const permissionsAfter = await client.query(
      `SELECT p.id, p.key, p.description
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.key ASC`,
      [roleId]
    );

    return permissionsAfter.rows;
  });
}
