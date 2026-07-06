import { pool } from "./client";
import { Vendor, OnboardingState } from "../types";
import { ParsedProductRow } from "../services/catalogImport";
import { BuyerSessionState } from "../types";

export async function createVendor(
  ownerTelegramId: number,
  businessName: string,
): Promise<Vendor> {
  const { rows } = await pool.query<Vendor>(
    `INSERT INTO vendors (owner_telegram_id, business_name)
     VALUES ($1, $2)
     ON CONFLICT (owner_telegram_id) DO UPDATE SET business_name = $2
     RETURNING *`,
    [ownerTelegramId, businessName],
  );
  return rows[0];
}

export async function saveVendorBotToken(
  vendorId: string,
  token: string,
  username: string,
): Promise<void> {
  await pool.query(
    `UPDATE vendors SET telegram_bot_token = $1, telegram_bot_username = $2 WHERE id = $3`,
    [token, username, vendorId],
  );
}

export async function saveVendorPhone(
  vendorId: string,
  phone: string,
): Promise<void> {
  await pool.query(
    `UPDATE vendors SET owner_phone = $1, phone_verified_at = now() WHERE id = $2`,
    [phone, vendorId],
  );
}

export async function markVendorActive(vendorId: string): Promise<void> {
  await pool.query(`UPDATE vendors SET status = 'active' WHERE id = $1`, [
    vendorId,
  ]);
}

export async function getVendorById(vendorId: string): Promise<Vendor | null> {
  const { rows } = await pool.query<Vendor>(
    `SELECT * FROM vendors WHERE id = $1`,
    [vendorId],
  );
  return rows[0] ?? null;
}

export async function bulkInsertProducts(
  vendorId: string,
  products: ParsedProductRow[],
): Promise<number> {
  if (products.length === 0) return 0;

  const values: string[] = [];
  const params: any[] = [];
  let idx = 1;

  for (const p of products) {
    values.push(
      `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`,
    );
    params.push(
      vendorId,
      p.name,
      p.description,
      p.price,
      p.stock_qty,
      p.image_url,
    );
  }

  await pool.query(
    `INSERT INTO products (vendor_id, name, description, price, stock_qty, image_url)
     VALUES ${values.join(", ")}`,
    params,
  );

  return products.length;
}

export async function getBuyerSession(
  telegramUserId: number,
  vendorId: string,
): Promise<BuyerSessionState | null> {
  const { rows } = await pool.query(
    `SELECT state FROM conversation_sessions WHERE telegram_user_id = $1 AND bot_context = $2`,
    [telegramUserId, vendorId],
  );
  return rows[0]?.state ?? null;
}

export async function setBuyerSession(
  telegramUserId: number,
  vendorId: string,
  state: BuyerSessionState,
): Promise<void> {
  await pool.query(
    `INSERT INTO conversation_sessions (telegram_user_id, bot_context, state, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (telegram_user_id, bot_context)
     DO UPDATE SET state = $3, updated_at = now()`,
    [telegramUserId, vendorId, JSON.stringify(state)],
  );
}

export async function getBuyerEmail(buyerId: string): Promise<string | null> {
  const { rows } = await pool.query<{ email: string | null }>(
    `SELECT email FROM buyers WHERE id = $1`,
    [buyerId],
  );
  return rows[0]?.email ?? null;
}

export async function saveBuyerEmail(
  buyerId: string,
  email: string,
): Promise<void> {
  await pool.query(`UPDATE buyers SET email = $1 WHERE id = $2`, [
    email,
    buyerId,
  ]);
}

export async function getVendorByIdActive(
  vendorId: string,
): Promise<Vendor | null> {
  const { rows } = await pool.query<Vendor>(
    `SELECT * FROM vendors WHERE id = $1 AND status = 'active'`,
    [vendorId],
  );
  return rows[0] ?? null;
}

// --- conversation state (used for both onboarding + later buyer sessions) ---
export async function getSessionState(
  telegramUserId: number,
  botContext: string,
): Promise<OnboardingState | null> {
  const { rows } = await pool.query(
    `SELECT state FROM conversation_sessions WHERE telegram_user_id = $1 AND bot_context = $2`,
    [telegramUserId, botContext],
  );
  return rows[0]?.state ?? null;
}

export async function setSessionState(
  telegramUserId: number,
  botContext: string,
  state: OnboardingState,
): Promise<void> {
  await pool.query(
    `INSERT INTO conversation_sessions (telegram_user_id, bot_context, state, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (telegram_user_id, bot_context)
     DO UPDATE SET state = $3, updated_at = now()`,
    [telegramUserId, botContext, JSON.stringify(state)],
  );
}
