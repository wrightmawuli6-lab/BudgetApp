import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(8).max(200)
});
