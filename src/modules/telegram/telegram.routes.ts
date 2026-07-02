import { Router } from "express";
import { getTelegramBotProfileController } from "./telegram.controller";

const router = Router();

router.get("/me", getTelegramBotProfileController);

export default router;