// import app from "./app";
// import { env } from "./config/env";

// app.listen(Number(env.PORT), () => {
//   console.log(`Server running on port ${env.PORT}`);
// });

import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { onboardingBot } from "./bot/onboarding.bot";

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
  console.log(`Received update for vendor ${vendorId}`, req.body);
  // TODO: dispatch to vendor bot handler
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.once("SIGINT", () => onboardingBot.stop("SIGINT"));
process.once("SIGTERM", () => onboardingBot.stop("SIGTERM"));