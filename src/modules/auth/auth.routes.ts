import { Router } from "express";
import { protect } from "@middleware/auth.middleware";

import { validateBody } from "@middleware/validate.middleware";
import {
  loginAdminController,
  loginVendorController,
  registerAdminController,
  registerVendorController,
  linkTelegramAccountController,
  loginWithTelegramController,
} from "./auth.controller";
import {
  adminLoginSchema,
  adminRegisterSchema,
  vendorLoginSchema,
  vendorRegisterSchema,
  telegramAuthSchema,
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

router.post(
  "/telegram/link",
  protect,
  validateBody(telegramAuthSchema),
  linkTelegramAccountController
);

router.post(
  "/telegram/login",
  validateBody(telegramAuthSchema),
  loginWithTelegramController
);

export default router;