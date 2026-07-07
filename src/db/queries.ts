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

export async function getVendorByOwnerTelegramId(
  ownerTelegramId: number,
): Promise<Vendor | null> {
  const { rows } = await pool.query<Vendor>(
    `SELECT * FROM vendors WHERE owner_telegram_id = $1 AND status = 'active'`,
    [ownerTelegramId],
  );
  return rows[0] ?? null;
}

export interface VendorOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface VendorOrderDetails {
  id: string;
  orderReference: string;
  status: string;
  totalAmount: number;
  buyerTelegramId: number;
  buyerUsername: string | null;
  buyerEmail: string | null;
  paidAt: string | null;
  createdAt: string | null;
  items: VendorOrderItem[];
}

function mapOrderDetails(row: any): VendorOrderDetails {
  return {
    id: row.id,
    orderReference: row.order_reference,
    status: row.status,
    totalAmount: Number(row.total_amount),
    buyerTelegramId: Number(row.buyer_telegram_id),
    buyerUsername: row.buyer_username,
    buyerEmail: row.buyer_email,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    items: row.items ?? [],
  };
}

export async function getRecentOrdersForVendor(
  vendorId: string,
  limit = 10,
): Promise<VendorOrderDetails[]> {
  const { rows } = await pool.query(
    `SELECT
       o.id,
       o.order_reference,
       o.status,
       o.total_amount,
       o.buyer_telegram_id,
       o.created_at,
       b.telegram_username AS buyer_username,
       b.email AS buyer_email,
       p.confirmed_at AS paid_at,
       COALESCE(
         json_agg(
           json_build_object(
             'name', pr.name,
             'quantity', ci.quantity,
             'unitPrice', ci.unit_price_snapshot
           )
         ) FILTER (WHERE ci.id IS NOT NULL),
         '[]'::json
       ) AS items
     FROM orders o
     JOIN buyers b ON b.id = o.buyer_id
     LEFT JOIN payments p ON p.order_id = o.id
     LEFT JOIN cart_items ci ON ci.cart_id = o.cart_id
     LEFT JOIN products pr ON pr.id = ci.product_id
     WHERE o.vendor_id = $1
     GROUP BY o.id, b.telegram_username, b.email, p.confirmed_at
     ORDER BY COALESCE(p.confirmed_at, o.created_at) DESC
     LIMIT $2`,
    [vendorId, limit],
  );

  return rows.map(mapOrderDetails);
}

export async function getOrderDetailsByReference(
  orderReference: string,
): Promise<VendorOrderDetails | null> {
  const { rows } = await pool.query(
    `SELECT
       o.id,
       o.order_reference,
       o.status,
       o.total_amount,
       o.buyer_telegram_id,
       o.created_at,
       b.telegram_username AS buyer_username,
       b.email AS buyer_email,
       p.confirmed_at AS paid_at,
       COALESCE(
         json_agg(
           json_build_object(
             'name', pr.name,
             'quantity', ci.quantity,
             'unitPrice', ci.unit_price_snapshot
           )
         ) FILTER (WHERE ci.id IS NOT NULL),
         '[]'::json
       ) AS items
     FROM orders o
     JOIN buyers b ON b.id = o.buyer_id
     LEFT JOIN payments p ON p.order_id = o.id
     LEFT JOIN cart_items ci ON ci.cart_id = o.cart_id
     LEFT JOIN products pr ON pr.id = ci.product_id
     WHERE o.order_reference = $1
     GROUP BY o.id, b.telegram_username, b.email, p.confirmed_at`,
    [orderReference],
  );

  return rows[0] ? mapOrderDetails(rows[0]) : null;
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
