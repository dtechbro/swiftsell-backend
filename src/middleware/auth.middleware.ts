/*
import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../modules/auth/jwt";

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
*/
export const protect = (req: any, res: any, next: any): void => {
  next();
};

