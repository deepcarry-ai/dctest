type TelegramPayload = {
  chat_id: string;
  text: string;
  disable_web_page_preview?: boolean;
};

export async function sendTelegram(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const payload: TelegramPayload = {
    chat_id: chatId,
    text: message,
    disable_web_page_preview: true,
  };

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.ok;
}
