import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "@config/env";
import { JwtPayload } from "./types";

export const generateAccessToken = (
  payload: JwtPayload,
) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export const verifyAccessToken = (
  token: string
): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
