import { z } from "zod";

export const vendorRegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(7).max(20).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(
      /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]';`~]/,
      "Password must contain at least one special character."
    ),
  
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  businessName: z.string().trim().min(2),
  businessEmail: z.string().trim().toLowerCase().email().optional(),
  businessPhone: z.string().trim().min(7).max(20),
});

export const vendorLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const adminRegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(7).max(20).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(
      /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]';`~]/,
      "Password must contain at least one special character."
    ),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type VendorRegisterInput = z.infer<typeof vendorRegisterSchema>;
export type VendorLoginInput = z.infer<typeof vendorLoginSchema>;

export type AdminRegisterInput = z.infer<typeof adminRegisterSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
