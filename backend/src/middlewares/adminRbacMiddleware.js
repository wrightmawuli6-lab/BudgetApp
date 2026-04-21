import { ApiError } from "../utils/ApiError.js";

export function requireAdminPermission(permissionKey) {
  return (req, _res, next) => {
    if (!req.admin) {
      return next(new ApiError(401, "Admin authentication required"));
    }

    if (req.admin.isSuperAdmin || req.admin.permissions.includes("*")) {
      return next();
    }

    if (!req.admin.permissions.includes(permissionKey)) {
      return next(new ApiError(403, `Missing required permission: ${permissionKey}`));
    }

    return next();
  };
}
