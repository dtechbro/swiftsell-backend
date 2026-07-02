import { z } from "zod";

export const vendorOnboardingSchema = z.object({
  businessName: z.string().trim().min(2).optional(),
  businessEmail: z.string().trim().toLowerCase().email().optional(),
  businessPhone: z.string().trim().min(7).max(20),
});

export type VendorOnboardingInput = z.infer<typeof vendorOnboardingSchema>;
