import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional()
});

export const assignRolePermissionsSchema = z.object({
  permissionIds: z.array(z.uuid()).min(1)
});
