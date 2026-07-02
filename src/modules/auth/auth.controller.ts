import { Request, Response } from "express";
import {
  loginAdmin,
  loginVendor,
  registerAdmin,
  registerVendor,
  linkTelegramAccount,
  loginWithTelegram,
} from "./auth.service";

export const registerVendorController = async (req: Request, res: Response) => {
  try {
    const result = await registerVendor(req.body);

    res.status(201).json({
      success: true,
      message: "Vendor registered successfully.",
      data: result,
    });
  } catch (error) {
    res.status(409).json({
      success: false,
      message: error instanceof Error ? error.message : "Registration failed.",
    });
  }
};

export const loginVendorController = async (req: Request, res: Response) => {
  try {
    const result = await loginVendor(req.body);

    res.status(200).json({
      success: true,
      message: "Vendor logged in successfully.",
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : "Login failed.",
    });
  }
};

export const registerAdminController = async (req: Request, res: Response) => {
  try {
    const result = await registerAdmin(req.body);

    res.status(201).json({
      success: true,
      message: "Admin registered successfully.",
      data: result,
    });
  } catch (error) {
    res.status(409).json({
      success: false,
      message: error instanceof Error ? error.message : "Admin registration failed.",
    });
  }
};

export const loginAdminController = async (req: Request, res: Response) => {
  try {
    const result = await loginAdmin(req.body);

    res.status(200).json({
      success: true,
      message: "Admin logged in successfully.",
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : "Admin login failed.",
    });
  }
};

export const linkTelegramAccountController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
      return;
    }

    const result = await linkTelegramAccount(req.user.userId, req.body);

    res.status(200).json({
      success: true,
      message: "Telegram account linked successfully.",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Telegram linking failed.",
    });
  }
};

export const loginWithTelegramController = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await loginWithTelegram(req.body);

    res.status(200).json({
      success: true,
      message: "Telegram login successful.",
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Telegram login failed.",
    });
  }
};
