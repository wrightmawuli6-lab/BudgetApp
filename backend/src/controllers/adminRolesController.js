import { assignPermissionsToRole, createRole, listRoles } from "../services/adminRoleService.js";
import { logAdminAudit } from "../services/adminAuditService.js";

export async function listRolesController(_req, res) {
  const result = await listRoles();
  res.status(200).json(result);
}

export async function createRoleController(req, res) {
  const role = await createRole(req.body);
  await logAdminAudit({
    actorAdminId: req.admin.id,
    action: "admin.role.create",
    entityType: "Role",
    entityId: role.id,
    metadata: { name: role.name },
    ip: req.ip
  });
  res.status(201).json({ role });
}

export async function assignRolePermissionsController(req, res) {
  const permissions = await assignPermissionsToRole(req.params.id, req.body.permissionIds);
  await logAdminAudit({
    actorAdminId: req.admin.id,
    action: "admin.role.permissions.updated",
    entityType: "Role",
    entityId: req.params.id,
    metadata: { permissionIds: req.body.permissionIds },
    ip: req.ip
  });
  res.status(200).json({ permissions });
}
