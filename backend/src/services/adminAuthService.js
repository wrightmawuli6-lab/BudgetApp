import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { query } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { getAdminPermissionContext } from "./adminPermissionService.js";
import { SUPER_ADMIN_ROLE } from "../constants/adminPermissions.js";

const SALT_ROUNDS = 12;

function signAdminToken(adminUser) {
  return jwt.sign({ sub: adminUser.id, email: adminUser.email, kind: "admin" }, env.adminJwtSecret, {
    expiresIn: env.adminJwtExpiresIn
  });
}

export async function hashAdminPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyAdminPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function loginAdminUser(payload) {
  const email = payload.email.trim().toLowerCase();
  const result = await query(
    `SELECT id, email, name, password_hash, is_active, created_at, updated_at
       FROM admin_users
      WHERE email = $1`,
    [email]
  );

  const admin = result.rows[0];
  if (!admin || !admin.is_active) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await verifyAdminPassword(payload.password, admin.password_hash);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = signAdminToken(admin);
  const context = await getAdminPermissionContext(admin.id);
  const hasSuperAdmin = context.roles.includes(SUPER_ADMIN_ROLE);

  return {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      is_active: admin.is_active,
      created_at: admin.created_at,
      updated_at: admin.updated_at
    },
    roles: context.roles,
    permissions: hasSuperAdmin ? ["*"] : context.permissions
  };
}

export function verifyAdminToken(token) {
  return jwt.verify(token, env.adminJwtSecret);
}

export async function getAdminMe(adminId) {
  const result = await query(
    `SELECT id, email, name, is_active, created_at, updated_at
       FROM admin_users
      WHERE id = $1`,
    [adminId]
  );
  const admin = result.rows[0];
  if (!admin || !admin.is_active) {
    throw new ApiError(401, "Admin session is invalid");
  }

  const context = await getAdminPermissionContext(admin.id);
  const hasSuperAdmin = context.roles.includes(SUPER_ADMIN_ROLE);

  return {
    admin,
    roles: context.roles,
    permissions: hasSuperAdmin ? ["*"] : context.permissions
  };
}
