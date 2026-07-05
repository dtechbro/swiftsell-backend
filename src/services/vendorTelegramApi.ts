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
  await fetch(`${TG(token)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  await fetch(`${TG(token)}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}
