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
// import { BuyerSessionState } from "../types";
import { createCheckoutOrder } from "../services/nombaService";
import { pool } from "../db/client";
import { randomUUID } from "crypto";
import { getBuyerEmail, saveBuyerEmail } from "../db/queries";
import { looksLikeEmail } from "../services/validators";

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
  const session = await getBuyerSession(telegramUserId, vendor.id);

  // handle mid-checkout email collection
  if (session?.step === "AWAITING_CHECKOUT_EMAIL") {
    if (!looksLikeEmail(text)) {
      await sendMessage(
        token,
        chatId,
        "That doesn doesn't look like a valid email, try again",
      );
      return;
    }
    await saveBuyerEmail(buyerId, text);
    await setBuyerSession(telegramUserId, vendor.id, {
      step: "BROWSING",
      buyerId,
      cartId,
    });
    await runCheckout(token, chatId, vendor, buyerId, cartId, text);
    return;
  }

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
    await handleCheckoutRequest(
      token,
      chatId,
      telegramUserId,
      vendor,
      buyerId,
      cartId,
    );
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
      await handleCheckoutRequest(
        token,
        chatId,
        telegramUserId,
        vendor,
        buyerId,
        cartId,
      );
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

async function handleCheckoutRequest(
  token: string,
  chatId: number,
  telegramUserId: number,
  vendor: Vendor,
  buyerId: string,
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

  const existingEmail = await getBuyerEmail(buyerId);
  if (existingEmail) {
    await runCheckout(token, chatId, vendor, buyerId, cartId, existingEmail);
    return;
  }

  // no email on file — ask, and pause checkout until we get one
  await setBuyerSession(telegramUserId, vendor.id, {
    step: "AWAITING_CHECKOUT_EMAIL",
    buyerId,
    cartId,
  });
  await sendMessage(
    token,
    chatId,
    "What email should we send your receipt to?",
  );
}

async function runCheckout(
  token: string,
  chatId: number,
  vendor: Vendor,
  buyerId: string,
  cartId: string,
  email: string,
): Promise<void> {
  const total = await getCartTotal(cartId);
  const orderReference = randomUUID();

  await pool.query(
    `INSERT INTO orders (vendor_id, buyer_id, cart_id, order_reference, total_amount, buyer_telegram_id, vendor_telegram_id)
     VALUES ($1, $2, $3, $4, $5,
       (SELECT telegram_user_id FROM buyers WHERE id = $2),
       $6)`,
    [
      vendor.id,
      buyerId,
      cartId,
      orderReference,
      total,
      vendor.owner_telegram_id,
    ],
  );

  const result = await createCheckoutOrder({
    vendorId: vendor.id,
    orderReference,
    amount: total,
    customerEmail: email,
  });

  if (!result) {
    await sendMessage(
      token,
      chatId,
      "Something went wrong starting checkout — please try again in a moment.",
    );
    return;
  }

  await sendMessage(
    token,
    chatId,
    `Tap below to pay ₦${total.toLocaleString()}. I'll confirm here as soon as it's done.`,
    [[{ text: "💳 Pay now", url: result.checkoutLink } as any]],
  );
}
