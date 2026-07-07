const TG = (token: string) => `https://api.telegram.org/bot${token}`;

export interface InlineButton {
  text: string;
  callback_data: string;
}

export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  buttons?: InlineButton[][],
): Promise<void> {
  const body: any = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (buttons) {
    body.reply_markup = { inline_keyboard: buttons };
  }
  const res = await fetch(`${TG(token)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Telegram sendMessage failed:", res.status, await res.text());
  }
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  const res = await fetch(`${TG(token)}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });

  if (!res.ok) {
    console.error(
      "Telegram answerCallbackQuery failed:",
      res.status,
      await res.text(),
    );
  }
}
