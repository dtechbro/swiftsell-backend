import { Router } from "express";
import { authorizeRoles, protect } from "@middleware/auth.middleware";
import { validateBody } from "@middleware/validate.middleware";
import {
  completeVendorOnboardingController,
  getMyVendorProfileController,
} from "./vendor.controller";
import { vendorOnboardingSchema } from "./vendor.validation";

const router = Router();

router.get(
  "/me",
  protect,
  authorizeRoles("VENDOR"),
  getMyVendorProfileController
);

router.patch(
  "/me/onboarding",
  protect,
  authorizeRoles("VENDOR"),
  validateBody(vendorOnboardingSchema),
  completeVendorOnboardingController
);

export default router;