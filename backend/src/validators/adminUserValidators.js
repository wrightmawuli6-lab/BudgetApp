import { z } from "zod";

export const createAdminUserSchema = z.object({
  email: z.email().max(255),
  name: z.string().min(2).max(120),
  password: z.string().min(8).max(200).optional(),
  sendInvite: z.boolean().optional()
});

export const updateAdminUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
  resetPassword: z.string().min(8).max(200).optional()
}).refine((payload) => Object.keys(payload).length > 0, "At least one update field is required");

export const assignAdminRolesSchema = z.object({
  roleIds: z.array(z.uuid()).min(1)
});
