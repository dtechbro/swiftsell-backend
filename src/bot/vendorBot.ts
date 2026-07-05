import { Vendor } from "../types";
import {
  sendMessage,
  answerCallbackQuery,
  InlineButton,
} from "../services/vendorTelegramApi";
import { searchProducts, Product } from "../services/productSearch";
import {
  getOrCreateBuyer,
  getOrCreateActiveCart,
  addToCart,
  getCartItems,
  getCartTotal,
  removeFromCart,
} from "../services/cartService";
import { getBuyerSession, setBuyerSession } from "../db/queries";
import { parseCallbackData } from "../services/callbackData";
import { BuyerSessionState } from "../types";

// Telegram update shape — minimal typing for what we use
interface TelegramUpdate {
  message?: {
    message_id: number;
    from: { id: number; username?: string };
    chat: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string };
    message: { chat: { id: number } };
    data: string;
  };
}

export async function handleVendorUpdate(
  vendor: Vendor,
  update: TelegramUpdate,
): Promise<void> {
  const token = vendor.telegram_bot_token!;

  if (update.message) {
    await handleMessage(vendor, token, update.message);
  } else if (update.callback_query) {
    await handleCallback(vendor, token, update.callback_query);
  }
}

async function handleMessage(
  vendor: Vendor,
  token: string,
  message: NonNullable<TelegramUpdate["message"]>,
): Promise<void> {
  const chatId = message.chat.id;
  const telegramUserId = message.from.id;
  const text = message.text?.trim() ?? "";

  const buyerId = await getOrCreateBuyer(telegramUserId, message.from.username);
  const cartId = await getOrCreateActiveCart(vendor.id, buyerId);

  if (text === "/start") {
    await setBuyerSession(telegramUserId, vendor.id, {
      step: "BROWSING",
      buyerId,
      cartId,
    });
    await sendMessage(
      token,
      chatId,
      `Hi! I'm ${vendor.business_name}'s assistant. What are you looking for today?`,
    );
    return;
  }

  if (/^cart$/i.test(text)) {
    await showCart(token, chatId, cartId);
    return;
  }

  if (/^checkout$/i.test(text)) {
    await beginCheckout(token, chatId, cartId);
    return;
  }

  // default: treat as a product search query
  const products = await searchProducts(vendor.id, text);
  await setBuyerSession(telegramUserId, vendor.id, {
    step: "BROWSING",
    buyerId,
    cartId,
    lastShownProductIds: products.map((p) => p.id),
  });

  if (products.length === 0) {
    await sendMessage(
      token,
      chatId,
      "Couldn't find anything matching that. Try a different word, or type \"cart\" to see what you've added.",
    );
    return;
  }

  await sendProductResults(token, chatId, products);
}

async function handleCallback(
  vendor: Vendor,
  token: string,
  callbackQuery: NonNullable<TelegramUpdate["callback_query"]>,
): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const telegramUserId = callbackQuery.from.id;
  const parsed = parseCallbackData(callbackQuery.data);

  if (!parsed) {
    await answerCallbackQuery(token, callbackQuery.id, "Something went wrong.");
    return;
  }

  const buyerId = await getOrCreateBuyer(
    telegramUserId,
    callbackQuery.from.username,
  );
  const cartId = await getOrCreateActiveCart(vendor.id, buyerId);

  switch (parsed.action) {
    case "add": {
      const product = await getProductIfAvailable(vendor.id, parsed.productId);
      if (!product) {
        await answerCallbackQuery(
          token,
          callbackQuery.id,
          "Sorry, that item is no longer available.",
        );
        return;
      }
      await addToCart(cartId, product, 1);
      await answerCallbackQuery(
        token,
        callbackQuery.id,
        `Added ${product.name} to cart ✅`,
      );
      break;
    }
    case "remove": {
      await removeFromCart(cartId, parsed.productId);
      await answerCallbackQuery(token, callbackQuery.id, "Removed from cart.");
      await showCart(token, chatId, cartId);
      break;
    }
    case "cart": {
      await answerCallbackQuery(token, callbackQuery.id);
      await showCart(token, chatId, cartId);
      break;
    }
    case "checkout": {
      await answerCallbackQuery(token, callbackQuery.id);
      await beginCheckout(token, chatId, cartId);
      break;
    }
  }
}

// --- helpers ---

async function getProductIfAvailable(
  vendorId: string,
  productId: string,
): Promise<Product | null> {
  const { pool } = await import("../db/client.js");
  const { rows } = (await pool.query(
    `SELECT * FROM products WHERE id = $1 AND vendor_id = $2 AND is_active = true AND stock_qty > 0`,
    [productId, vendorId],
  )) as { rows: Product[] };
  return rows[0] ?? null;
}

async function sendProductResults(
  token: string,
  chatId: number,
  products: Product[],
): Promise<void> {
  for (const p of products) {
    const buttons: InlineButton[][] = [
      [
        {
          text: `Add to cart — ₦${p.price.toLocaleString()}`,
          callback_data: `add:${p.id}`,
        },
      ],
    ];
    const caption = `*${p.name}*\n${p.description ?? ""}\n₦${p.price.toLocaleString()}`;
    await sendMessage(token, chatId, caption, buttons);
  }
  await sendMessage(
    token,
    chatId,
    'Type "cart" to review your cart, or keep searching.',
  );
}

async function showCart(
  token: string,
  chatId: number,
  cartId: string,
): Promise<void> {
  const items = await getCartItems(cartId);
  if (items.length === 0) {
    await sendMessage(
      token,
      chatId,
      "Your cart is empty. Tell me what you're looking for!",
    );
    return;
  }

  const lines = items.map(
    (i) =>
      `${i.quantity}x ${i.name} — ₦${(i.quantity * i.unit_price_snapshot).toLocaleString()}`,
  );
  const total = await getCartTotal(cartId);
  const text = `*Your cart:*\n${lines.join("\n")}\n\n*Total: ₦${total.toLocaleString()}*`;

  const removeButtons: InlineButton[][] = items.map((i) => [
    { text: `Remove ${i.name}`, callback_data: `remove:${i.product_id}` },
  ]);
  removeButtons.push([{ text: "✅ Checkout", callback_data: "checkout" }]);

  await sendMessage(token, chatId, text, removeButtons);
}

async function beginCheckout(
  token: string,
  chatId: number,
  cartId: string,
): Promise<void> {
  const items = await getCartItems(cartId);
  if (items.length === 0) {
    await sendMessage(
      token,
      chatId,
      "Your cart is empty — add something first!",
    );
    return;
  }
  // Nomba integration goes here next
  await sendMessage(
    token,
    chatId,
    "Checkout coming next — this is where we'll generate your Nomba payment link.",
  );
}
