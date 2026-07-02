import { Request, Response } from "express";
import {
  completeVendorOnboarding,
  getMyVendorProfile,
} from "./vendor.service";

export const getMyVendorProfileController = async (
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

    const vendor = await getMyVendorProfile(req.user.userId);

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to fetch vendor profile.",
    });
  }
};

export const completeVendorOnboardingController = async (
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

    const vendor = await completeVendorOnboarding(req.user.userId, req.body);

    res.status(200).json({
      success: true,
      message: "Vendor onboarding completed successfully.",
      data: vendor,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to complete vendor onboarding.",
    });
  }
};