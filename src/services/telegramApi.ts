import { TelegramBotInfo } from "../types";

interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
}

const TG = (token: string) => `https://api.telegram.org/bot${token}`;

export async function validateBotToken(
  token: string,
): Promise<TelegramBotInfo | null> {
  try {
    const res = await fetch(`${TG(token)}/getMe`);
    const data = (await res.json()) as TelegramApiResponse<TelegramBotInfo>;
    if (!data.ok) return null;
    return data.result;
  } catch {
    return null;
  }
}

export async function registerWebhook(
  token: string,
  vendorId: string,
): Promise<boolean> {
  const url = `${process.env.BASE_URL}/webhook/vendor/${vendorId}`;
  const res = await fetch(`${TG(token)}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as TelegramApiResponse<boolean>;
  return data.ok === true;
}
