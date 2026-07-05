import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { onboardingBot } from "./bot/onboarding.bot";
import { getVendorByIdActive } from "./db/queries";
import { handleVendorUpdate } from "./bot/vendorBot";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.send("ok"));

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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.once("SIGINT", () => onboardingBot.stop("SIGINT"));
process.once("SIGTERM", () => onboardingBot.stop("SIGTERM"));
