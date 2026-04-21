import { ApiError } from "../utils/ApiError.js";
import { getAdminMe, loginAdminUser } from "../services/adminAuthService.js";
import { logAdminAudit } from "../services/adminAuditService.js";

export async function adminLoginController(req, res) {
  try {
    const result = await loginAdminUser(req.body);
    await logAdminAudit({
      actorAdminId: result.admin.id,
      action: "admin.login.success",
      entityType: "AdminUser",
      entityId: result.admin.id,
      metadata: { email: result.admin.email },
      ip: req.ip
    });
    res.status(200).json(result);
  } catch (error) {
    await logAdminAudit({
      actorAdminId: null,
      action: "admin.login.failed",
      entityType: "AdminUser",
      entityId: null,
      metadata: { email: req.body.email },
      ip: req.ip
    });
    throw error;
  }
}

export async function adminMeController(req, res) {
  if (!req.admin?.id) {
    throw new ApiError(401, "Admin authentication required");
  }

  const me = await getAdminMe(req.admin.id);
  res.status(200).json(me);
}

export async function adminLogoutController(req, res) {
  await logAdminAudit({
    actorAdminId: req.admin?.id || null,
    action: "admin.logout",
    entityType: "AdminUser",
    entityId: req.admin?.id || null,
    metadata: {},
    ip: req.ip
  });
  res.status(200).json({ success: true });
}
