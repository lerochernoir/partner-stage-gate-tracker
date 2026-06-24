import { z } from "zod";

export const userFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").optional(),
  department: z.string().trim().optional(),
  region: z.string().trim().optional(),
  status: z.enum(["pending", "active", "inactive"]),
  roleIds: z.array(z.string().uuid()).min(1, "At least one role is required."),
});

export const editUserFormSchema = userFormSchema.omit({ password: true });
