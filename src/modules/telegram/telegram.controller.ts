import { Request, Response } from "express";
import { getTelegramBotProfile } from "./telegram.service";

export const getTelegramBotProfileController = async (
  req: Request,
  res: Response
) => {
  try {
    const bot = await getTelegramBotProfile();

    res.status(200).json({
      success: true,
      data: bot,
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to fetch bot profile.",
    });
  }
};