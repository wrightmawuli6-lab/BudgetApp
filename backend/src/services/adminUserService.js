import crypto from "crypto";

import { query, withTransaction } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { hashAdminPassword } from "./adminAuthService.js";

function randomPassword() {
  return crypto.randomBytes(12).toString("base64url");
}

export async function listAdminUsers() {
  const result = await query(
    `SELECT au.id, au.email, au.name, au.is_active, au.created_at, au.updated_at,
            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object('id', r.id, 'name', r.name)
              ) FILTER (WHERE r.id IS NOT NULL),
              '[]'::json
            ) AS roles
       FROM admin_users au
       LEFT JOIN admin_user_roles aur ON aur.admin_user_id = au.id
       LEFT JOIN roles r ON r.id = aur.role_id
      GROUP BY au.id
      ORDER BY au.created_at DESC`
  );

  return result.rows;
}

export async function listAppUsers() {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.created_at,
            p.monthly_income, p.student_type, p.debt_amount
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
      ORDER BY u.created_at DESC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    created_at: row.created_at,
    monthly_income: row.monthly_income !== null && row.monthly_income !== undefined ? Number(row.monthly_income) : null,
    student_type: row.student_type || null,
    debt_amount: row.debt_amount !== null && row.debt_amount !== undefined ? Number(row.debt_amount) : null
  }));
}

export async function createAdminUser(payload) {
  const email = payload.email.trim().toLowerCase();
  const password = payload.password || randomPassword();
  const passwordHash = await hashAdminPassword(password);
  const inviteOnly = payload.sendInvite === true && !payload.password;

  const result = await query(
    `INSERT INTO admin_users (email, name, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, name, is_active, created_at, updated_at`,
    [email, payload.name.trim(), passwordHash]
  );

  const adminUser = result.rows[0];
  if (!adminUser) {
    throw new ApiError(409, "Admin email already exists");
  }

  return {
    adminUser,
    temporaryPassword: inviteOnly ? password : null
  };
}

export async function updateAdminUser(adminId, payload) {
  return withTransaction(async (client) => {
    const existing = await client.query("SELECT id, is_active FROM admin_users WHERE id = $1", [adminId]);
    if (!existing.rows[0]) {
      throw new ApiError(404, "Admin user not found");
    }

    const updates = [];
    const values = [];
    let i = 1;

    if (payload.name !== undefined) {
      updates.push(`name = $${i++}`);
      values.push(payload.name.trim());
    }
    if (payload.isActive !== undefined) {
      updates.push(`is_active = $${i++}`);
      values.push(payload.isActive);
    }
    if (payload.resetPassword !== undefined) {
      const hash = await hashAdminPassword(payload.resetPassword);
      updates.push(`password_hash = $${i++}`);
      values.push(hash);
    }

    updates.push("updated_at = NOW()");
    values.push(adminId);

    const result = await client.query(
      `UPDATE admin_users
          SET ${updates.join(", ")}
        WHERE id = $${i}
      RETURNING id, email, name, is_active, created_at, updated_at`,
      values
    );

    return result.rows[0];
  });
}

export async function assignRolesToAdminUser(adminId, roleIds) {
  return withTransaction(async (client) => {
    const adminResult = await client.query("SELECT id FROM admin_users WHERE id = $1", [adminId]);
    if (!adminResult.rows[0]) {
      throw new ApiError(404, "Admin user not found");
    }

    const roleResult = await client.query("SELECT id FROM roles WHERE id = ANY($1::uuid[])", [roleIds]);
    if (roleResult.rowCount !== roleIds.length) {
      throw new ApiError(400, "One or more role IDs are invalid");
    }

    await client.query("DELETE FROM admin_user_roles WHERE admin_user_id = $1", [adminId]);
    for (const roleId of roleIds) {
      await client.query(
        `INSERT INTO admin_user_roles (admin_user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (admin_user_id, role_id) DO NOTHING`,
        [adminId, roleId]
      );
    }

    const rolesAfter = await client.query(
      `SELECT r.id, r.name
         FROM admin_user_roles aur
         JOIN roles r ON r.id = aur.role_id
        WHERE aur.admin_user_id = $1
        ORDER BY r.name ASC`,
      [adminId]
    );

    return rolesAfter.rows;
  });
}
