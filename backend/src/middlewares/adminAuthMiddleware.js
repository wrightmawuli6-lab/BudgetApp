import { ApiError } from "../utils/ApiError.js";
import { verifyAdminToken } from "../services/adminAuthService.js";
import { getAdminPermissionContext } from "../services/adminPermissionService.js";
import { SUPER_ADMIN_ROLE } from "../constants/adminPermissions.js";
import { query } from "../config/db.js";

export async function adminAuthMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or invalid admin authorization token"));
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAdminToken(token);
    const adminResult = await query(
      `SELECT id, email
         FROM admin_users
        WHERE id = $1 AND is_active = TRUE`,
      [payload.sub]
    );
    if (!adminResult.rows[0]) {
      return next(new ApiError(401, "Admin account is inactive or unavailable"));
    }

    const context = await getAdminPermissionContext(payload.sub);
    const hasSuperAdmin = context.roles.includes(SUPER_ADMIN_ROLE);

    req.admin = {
      id: payload.sub,
      email: adminResult.rows[0].email,
      roles: context.roles,
      permissions: hasSuperAdmin ? ["*"] : context.permissions,
      isSuperAdmin: hasSuperAdmin
    };
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired admin token"));
  }
}
