import { Telegraf, Markup, Context } from "telegraf";
import { validateBotToken, registerWebhook } from "../services/telegramApi";
import {
  createVendor,
  saveVendorBotToken,
  saveVendorPhone,
  getSessionState,
  setSessionState,
  markVendorActive,
  bulkInsertProducts,
  getVendorById,
} from "../db/queries";
import { OnboardingState } from "../types";
import { generateProductTemplate } from "../services/csvTemplate";
import { parseProductCsv } from "../services/catalogImport";
import { pool } from "db/client";

const BOT_CONTEXT = "onboarding";

export const onboardingBot = new Telegraf(process.env.ONBOARDING_BOT_TOKEN!);

onboardingBot.start(async (ctx: Context) => {
  if (!ctx.from) return;

  const existing = await pool.query(
    `SELECT id, status FROM vendors WHERE owner_telegram_id = $1`,
    [ctx.from.id],
  );

  if (existing.rows[0] && existing.rows[0].status === "active") {
    await ctx.reply(
      "You already have a store set up. Send /addproducts to add more products, " +
      "or contact support if you need to reset your setup."
    );
    return;
  }

  await setSessionState(ctx.from.id, BOT_CONTEXT, {
    step: "AWAITING_BUSINESS_NAME",
  });
  await ctx.reply("Let's set up your store. What's your business name?");
});

onboardingBot.on("text", async (ctx: Context) => {
  if (
    !ctx.from ||
    !ctx.message ||
    !("text" in ctx.message) ||
    !ctx.message.text
  )
    return;
  const state = await getSessionState(ctx.from.id, BOT_CONTEXT);
  if (!state) {
    await ctx.reply("Send /start to begin setting up your store.");
    return;
  }

  const text = ctx.message.text.trim();

  switch (state.step) {
    case "AWAITING_BUSINESS_NAME": {
      const vendor = await createVendor(ctx.from.id, text);
      const next: OnboardingState = {
        step: "AWAITING_BOT_TOKEN",
        vendorId: vendor.id,
      };
      await setSessionState(ctx.from.id, BOT_CONTEXT, next);
      await ctx.reply(
        "Now create your own bot:\n\n" +
          "1. Open a chat with @BotFather\n" +
          "2. Send /newbot\n" +
          "3. Follow the prompts to name it\n" +
          "4. Paste the token it gives you here (looks like 123456789:ABC-xyz...)",
      );
      break;
    }

    case "AWAITING_BOT_TOKEN": {
      if (!state.vendorId) return; // shouldn't happen, but keep TS + runtime honest
      const botInfo = await validateBotToken(text);
      if (!botInfo) {
        await ctx.reply(
          "That token didn't work. Double-check it and paste it again.",
        );
        return;
      }

      await saveVendorBotToken(state.vendorId, text, botInfo.username);
      const webhookOk = await registerWebhook(text, state.vendorId);
      if (!webhookOk) {
        await ctx.reply(
          "Bot connected, but webhook setup failed. Paste the token again to retry.",
        );
        return;
      }

      const next: OnboardingState = {
        step: "AWAITING_PHONE",
        vendorId: state.vendorId,
      };
      await setSessionState(ctx.from.id, BOT_CONTEXT, next);
      await ctx.reply(
        `Bot connected as @${botInfo.username}! One last thing — share your phone number:`,
        Markup.keyboard([Markup.button.contactRequest("📱 Share phone number")])
          .oneTime()
          .resize(),
      );
      break;
    }

    // case "AWAITING_CATALOG": {
    //   if (!state.vendorId) return;
    //   // Full parsing comes in the catalog-import step — for now, just accept and mark done
    //   await markVendorActive(state.vendorId);
    //   await setSessionState(ctx.from.id, BOT_CONTEXT, {
    //     step: "DONE",
    //     vendorId: state.vendorId,
    //   });
    //   await ctx.reply("You're live! We'll wire up your product catalog next.");
    //   break;
    // }

    case "DONE":
      await ctx.reply(
        "You're already set up. Catalog import is coming in the next step.",
      );
      break;
  }
});

// onboardingBot.on("contact", async (ctx: Context) => {
//   if (
//     !ctx.from ||
//     !ctx.message ||
//     !("contact" in ctx.message) ||
//     !ctx.message.contact
//   )
//     return;
//   const state = await getSessionState(ctx.from.id, BOT_CONTEXT);
//   if (!state || state.step !== "AWAITING_PHONE" || !state.vendorId) return;

//   await saveVendorPhone(state.vendorId, ctx.message.contact.phone_number);
//   const next: OnboardingState = {
//     step: "AWAITING_CATALOG",
//     vendorId: state.vendorId,
//   };
//   await setSessionState(ctx.from.id, BOT_CONTEXT, next);

//   await ctx.reply(
//     "Got it. Next: paste the link to your product sheet (we'll wire this up shortly).",
//     Markup.removeKeyboard(),
//   );
// });

onboardingBot.on("contact", async (ctx) => {
  const state = await getSessionState(ctx.from.id, BOT_CONTEXT);
  if (!state || state.step !== "AWAITING_PHONE" || !state.vendorId) return;

  await saveVendorPhone(state.vendorId, ctx.message.contact.phone_number);
  await setSessionState(ctx.from.id, BOT_CONTEXT, {
    step: "AWAITING_CATALOG",
    vendorId: state.vendorId,
  });

  // send the template file
  const templateCsv = generateProductTemplate();
  await ctx.replyWithDocument(
    { source: Buffer.from(templateCsv), filename: "product_template.csv" },
    {
      caption:
        "Fill this in with your products, then send it back here as a file.",
    },
  );
  await ctx.reply(
    "Required: name, price. Everything else is optional. Reply here once you've sent it.",
    Markup.removeKeyboard(),
  );
});

onboardingBot.on("document", async (ctx) => {
  const state = await getSessionState(ctx.from.id, BOT_CONTEXT);
  if (!state || !state.vendorId) return;
  if (state.step !== "AWAITING_CATALOG" && state.step !== "DONE") return;

  const doc = ctx.message.document;
  if (!doc.file_name?.endsWith(".csv")) {
    await ctx.reply("Please send a .csv file.");
    return;
  }

  await ctx.reply("Got it, processing...");

  try {
    const fileLink = await ctx.telegram.getFileLink(doc.file_id);
    const res = await fetch(fileLink.toString());
    const csvText = await res.text();

    const { valid, errors } = parseProductCsv(csvText);
    const insertedCount = await bulkInsertProducts(state.vendorId, valid);

    let message = `✅ ${insertedCount} product${insertedCount === 1 ? "" : "s"} added.`;
    if (errors.length > 0) {
      const errorLines = errors
        .slice(0, 10)
        .map((e) => `Row ${e.row}: ${e.reason}`)
        .join("\n");
      message += `\n\n⚠️ ${errors.length} row${errors.length === 1 ? "" : "s"} skipped:\n${errorLines}`;
      if (errors.length > 10) message += `\n...and ${errors.length - 10} more`;
    }

    // Auto-activate on first successful batch
    if (state.step === "AWAITING_CATALOG" && insertedCount > 0) {
      await markVendorActive(state.vendorId);
      await setSessionState(ctx.from.id, BOT_CONTEXT, {
        step: "DONE",
        vendorId: state.vendorId,
      });
      const vendor = await getVendorById(state.vendorId);
      message += `\n\n🎉 Your store is live! Message @${vendor?.telegram_bot_username} to try it as a buyer would.`;
      message += `\nSend /addproducts anytime to upload more.`;
    } else if (state.step === "DONE") {
      message += `\n\nAdded to your live catalog.`;
    } else if (insertedCount === 0) {
      message += `\n\nNo valid products found — fix the errors above and resend the file.`;
    }

    await ctx.reply(message);
  } catch (err) {
    console.error("CSV import failed:", err);
    await ctx.reply(
      "Something went wrong reading that file. Make sure it's a valid CSV and try again.",
    );
  }
});

// Re-open the upload state on demand
onboardingBot.command("addproducts", async (ctx) => {
  const state = await getSessionState(ctx.from.id, BOT_CONTEXT);
  if (!state || !state.vendorId) {
    await ctx.reply("You haven't set up a store yet. Send /start to begin.");
    return;
  }

  await setSessionState(ctx.from.id, BOT_CONTEXT, {
    step: "AWAITING_CATALOG",
    vendorId: state.vendorId,
  });
  const templateCsv = generateProductTemplate();
  await ctx.replyWithDocument(
    { source: Buffer.from(templateCsv), filename: "product_template.csv" },
    {
      caption:
        "Send products as a filled CSV — reuse this template or your own file with the same columns.",
    },
  );
});
