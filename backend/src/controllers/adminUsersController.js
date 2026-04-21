import {
  assignRolesToAdminUser,
  createAdminUser,
  listAppUsers,
  listAdminUsers,
  updateAdminUser
} from "../services/adminUserService.js";
import { logAdminAudit } from "../services/adminAuditService.js";

export async function listAdminUsersController(_req, res) {
  const [adminUsers, appUsers] = await Promise.all([listAdminUsers(), listAppUsers()]);
  res.status(200).json({
    users: adminUsers,
    adminUsers,
    appUsers
  });
}

export async function createAdminUserController(req, res) {
  const result = await createAdminUser(req.body);
  await logAdminAudit({
    actorAdminId: req.admin.id,
    action: "admin.user.create",
    entityType: "AdminUser",
    entityId: result.adminUser.id,
    metadata: {
      email: result.adminUser.email,
      sendInvite: req.body.sendInvite === true
    },
    ip: req.ip
  });

  res.status(201).json(result);
}

export async function updateAdminUserController(req, res) {
  const user = await updateAdminUser(req.params.id, req.body);
  const metadata = {
    ...req.body,
    resetPassword: req.body.resetPassword ? "[REDACTED]" : undefined
  };
  await logAdminAudit({
    actorAdminId: req.admin.id,
    action: req.body.isActive === false ? "admin.user.deactivate" : "admin.user.update",
    entityType: "AdminUser",
    entityId: user.id,
    metadata,
    ip: req.ip
  });

  res.status(200).json({ user });
}

export async function assignRolesToAdminUserController(req, res) {
  const roles = await assignRolesToAdminUser(req.params.id, req.body.roleIds);
  await logAdminAudit({
    actorAdminId: req.admin.id,
    action: "admin.user.roles.updated",
    entityType: "AdminUser",
    entityId: req.params.id,
    metadata: { roleIds: req.body.roleIds },
    ip: req.ip
  });

  res.status(200).json({ roles });
}
