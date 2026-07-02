import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../modules/auth/jwt";
import type { JwtPayload } from "../modules/auth/types";

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. No token provided.",
      });
      return;
    }

    const [, token] = authHeader.split(" ");
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Invalid authorization header.",
      });
      return;
    }
  
    const decoded = verifyAccessToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export const authorizeRoles =
  (...allowedRoles: JwtPayload["role"][]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission to access this resource.",
      });
      return;
    }

    next();
  };
