import { Router } from "express";
import { validateBody } from "@middleware/validate.middleware";
import {
  loginAdminController,
  loginVendorController,
  registerAdminController,
  registerVendorController,
} from "./auth.controller";
import {
  adminLoginSchema,
  adminRegisterSchema,
  vendorLoginSchema,
  vendorRegisterSchema,
} from "./auth.validation";

const router = Router();

router.post(
  "/vendor/register",
  validateBody(vendorRegisterSchema),
  registerVendorController
);

router.post(
  "/vendor/login",
  validateBody(vendorLoginSchema),
  loginVendorController
);

router.post(
  "/admin/register",
  validateBody(adminRegisterSchema),
  registerAdminController
);

router.post(
  "/admin/login",
  validateBody(adminLoginSchema),
  loginAdminController
);

export default router;