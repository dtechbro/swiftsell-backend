import { Request, Response } from "express";
import {
  loginAdmin,
  loginVendor,
  registerAdmin,
  registerVendor,
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
