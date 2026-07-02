import crypto from "crypto";
import { env } from "@config/env";
import type { VerifiedTelegramInitData, TelegramGetMeResponse } from "./telegram.types";

const MAX_INIT_DATA_AGE_SECONDS = 60 * 60;

export const verifyTelegramInitData = (
  initData: string
): VerifiedTelegramInitData => {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Telegram hash is missing.");
  }

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(env.TELEGRAM_BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== hash) {
    throw new Error("Invalid Telegram auth data.");
  }

  const authDate = Number(params.get("auth_date"));

  if (!authDate) {
    throw new Error("Telegram auth_date is missing.");
  }

  const ageInSeconds = Math.floor(Date.now() / 1000) - authDate;

  if (ageInSeconds > MAX_INIT_DATA_AGE_SECONDS) {
    throw new Error("Telegram auth data has expired.");
  }

  const rawUser = params.get("user");

  if (!rawUser) {
    throw new Error("Telegram user is missing.");
  }

  return {
    user: JSON.parse(rawUser),
    authDate: new Date(authDate * 1000),
  };
};

export const getTelegramBotProfile = async () => {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`
  );

  const data = await response.json() as TelegramGetMeResponse;

  if (!data.ok || !data.result) {
    throw new Error(data.description || "Unable to verify Telegram bot token.");
  }

  return data.result;
};