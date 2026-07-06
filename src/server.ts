import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { onboardingBot } from "./bot/onboarding.bot";
import { getVendorByIdActive } from "./db/queries";
import { handleVendorUpdate } from "./bot/vendorBot";
import crypto from "crypto";
import { pool } from "./db/client";
import { sendMessage } from "./services/vendorTelegramApi";
import { decrypt } from "./services/encryption";

const app = express();

function verifyNombaSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signatureHeader),
    );
  } catch {
    return false; // length mismatch etc. — fail closed, never throw past this
  }
}

app.post(
  "/webhook/nomba",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["NombaHackathon2026"] as string | undefined; // CONFIRM real header name in sandbox test
    const valid = verifyNombaSignature(
      req.body,
      signature,
      process.env.NOMBA_WEBHOOK_SECRET!,
    );

    if (!valid) {
      console.warn("Rejected Nomba webhook: invalid signature");
      return res.sendStatus(401);
    }

    res.sendStatus(200); // ack immediately, process after

    let event: any;
    try {
      event = JSON.parse(req.body.toString());
    } catch {
      console.error("Nomba webhook: malformed JSON body");
      return;
    }

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

const isProd = process.env.NODE_ENV === "development";

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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.once("SIGINT", () => onboardingBot.stop("SIGINT"));
process.once("SIGTERM", () => onboardingBot.stop("SIGTERM"));
