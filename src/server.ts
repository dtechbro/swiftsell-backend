import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { onboardingBot } from "./bot/onboarding.bot";
import { getVendorByIdActive } from "./db/queries";
import { handleVendorUpdate } from "./bot/vendorBot";
import crypto from "crypto";
import { sendMessage } from "./services/vendorTelegramApi";
import { pool } from "./db/client";

const app = express();

function buildHashingPayload(event: any, timestamp: string): string {
  const data = event?.data ?? {};
  const merchant = data.merchant ?? {};
  const transaction = data.transaction ?? {};

  const eventType = event?.event_type ?? "";
  const requestId = event?.requestId ?? "";
  const userId = merchant.userId ?? "";
  const walletId = merchant.walletId ?? "";
  const transactionId = transaction.transactionId ?? "";
  const transactionType = transaction.type ?? "";
  const transactionTime = transaction.time ?? "";
  let responseCode = transaction.responseCode ?? "";
  if (responseCode === "null") responseCode = "";

  return [
    eventType,
    requestId,
    userId,
    walletId,
    transactionId,
    transactionType,
    transactionTime,
    responseCode,
    timestamp,
  ].join(":");
}

function verifyNombaSignature(
  event: any,
  timestamp: string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !timestamp) return false;

  const hashingPayload = buildHashingPayload(event, timestamp);
  const computed = crypto
    .createHmac("sha256", secret)
    .update(hashingPayload)
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signatureHeader),
    );
  } catch {
    return false;
  }
}

app.post(
  "/webhook/nomba",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("Nomba webhook endpoint hit");
console.log("Content-Type:", req.headers["content-type"]);
console.log("Body is Buffer:", Buffer.isBuffer(req.body));
console.log("Body length:", req.body?.length);
console.log("Raw body:", req.body?.toString());

    const signature = req.headers["nomba-signature"] as string | undefined; // CONFIRM real header name in sandbox test
    const timestamp = req.headers["nomba-timestamp"] as string | undefined;

    let event: any;
    try {
      // Handle both Buffer and string body
      const bodyStr = Buffer.isBuffer(req.body)
        ? req.body.toString()
        : req.body;
      console.log(
        "Raw body type:",
        typeof req.body,
        "isBuffer:",
        Buffer.isBuffer(req.body),
      );
      console.log("Raw body content:", bodyStr?.substring(0, 200));
      event = JSON.parse(bodyStr);
    } catch (err) {
      console.error("Nomba webhook: malformed JSON body", err);
      console.error("Body that failed to parse:", req.body);
      return res.sendStatus(400);
    }

    console.log("RAW NOMBA WEBHOOK:", JSON.stringify(event, null, 2));
    console.log("HEADERS:", timestamp, signature);

    const valid = verifyNombaSignature(
      event,
      timestamp ?? " ",
      signature,
      process.env.NOMBA_WEBHOOK_SECRET!,
    );

    if (!valid) {
      console.warn("Rejected Nomba webhook: invalid signature");
      return res.sendStatus(401);
    }

    res.sendStatus(200); // ack immediately, process after

    if (event.event_type === "payment_success") {
      await handlePaymentSuccess(event.data).catch((err) =>
        console.error("Error processing payment_success:", err),
      );
    }
  },
);

async function handlePaymentSuccess(data: any): Promise<void> {
  const orderReference = data.orderReference;
  if (!orderReference) return;

  // idempotency: unique constraint stops double-processing if Nomba retries delivery
  const inserted = await pool.query(
    `INSERT INTO payments (order_id, nomba_order_reference, status, amount, raw_webhook_payload, confirmed_at)
     SELECT id, $1, 'confirmed', $2, $3, now() FROM orders WHERE order_reference = $1
     ON CONFLICT (nomba_order_reference) DO NOTHING
     RETURNING order_id`,
    [orderReference, data.amount ?? 0, JSON.stringify(data)],
  );

  if (inserted.rows.length === 0) {
    console.log(
      `Payment for ${orderReference} already processed — skipping duplicate webhook`,
    );
    return;
  }

  const { rows } = await pool.query(
    `UPDATE orders SET status = 'paid' WHERE order_reference = $1
     RETURNING vendor_id, buyer_telegram_id, vendor_telegram_id, total_amount`,
    [orderReference],
  );
  const order = rows[0];
  if (!order) return;

  const vendorRow = await pool.query(
    `SELECT telegram_bot_token, business_name FROM vendors WHERE id = $1`,
    [order.vendor_id],
  );
  const vendorBotToken = vendorRow.rows[0]?.telegram_bot_token;
  if (!vendorBotToken) return;

  await sendMessage(
    vendorBotToken,
    order.buyer_telegram_id,
    `✅ Payment confirmed! Your order for ₦${Number(order.total_amount).toLocaleString()} is being prepared.`,
  );

  await sendMessage(
    vendorBotToken,
    order.vendor_telegram_id,
    `🎉 New order paid — ₦${Number(order.total_amount).toLocaleString()}. Check your Nomba dashboard for settlement details.`,
  );
}

app.use(express.json());

app.get("/health", (_req, res) => res.send("ok"));

// Test endpoint to verify webhook accessibility
app.post("/webhook/test", express.json(), (req, res) => {
  console.log("Test webhook received:", req.body);
  res.json({ received: true, body: req.body });
});

const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  // Production: onboarding bot runs on webhook too
  app.use(onboardingBot.webhookCallback("/webhook/onboarding"));
} else {
  // Local dev: long polling, no public URL needed
  onboardingBot.launch();
  console.log("Onboarding bot running on long polling (dev mode)");
}

// Vendor webhooks (built out fully in the buyer-flow step)

app.post("/webhook/vendor/:vendorId", async (req, res) => {
  const { vendorId } = req.params;

  // Acknowledge Telegram immediately — don't make it wait on our processing
  res.sendStatus(200);

  try {
    const vendor = await getVendorByIdActive(vendorId);
    if (!vendor) {
      console.warn(`Webhook for unknown/inactive vendor: ${vendorId}`);
      return;
    }
    await handleVendorUpdate(vendor, req.body);
  } catch (err) {
    console.error(`Error handling update for vendor ${vendorId}:`, err);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

process.once("SIGINT", () => onboardingBot.stop("SIGINT"));
process.once("SIGTERM", () => onboardingBot.stop("SIGTERM"));
