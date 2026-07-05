import { pool } from "../db/client";
import { Product } from "./productSearch";

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price_snapshot: number;
  name?: string; // joined in for display
}

export async function getOrCreateBuyer(
  telegramUserId: number,
  username: string | undefined,
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO buyers (telegram_user_id, telegram_username)
     VALUES ($1, $2)
     ON CONFLICT (telegram_user_id) DO UPDATE SET telegram_username = $2
     RETURNING id`,
    [telegramUserId, username ?? null],
  );
  return rows[0].id;
}

export async function getOrCreateActiveCart(
  vendorId: string,
  buyerId: string,
): Promise<string> {
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM carts WHERE vendor_id = $1 AND buyer_id = $2 AND status = 'active'`,
    [vendorId, buyerId],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await pool.query<{ id: string }>(
    `INSERT INTO carts (vendor_id, buyer_id, status) VALUES ($1, $2, 'active') RETURNING id`,
    [vendorId, buyerId],
  );
  return created.rows[0].id;
}

export async function addToCart(
  cartId: string,
  product: Product,
  quantity = 1,
): Promise<void> {
  // if this product is already in the cart, bump quantity instead of duplicating a row
  const existing = await pool.query<{ id: string; quantity: number }>(
    `SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
    [cartId, product.id],
  );

  if (existing.rows[0]) {
    await pool.query(
      `UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2`,
      [quantity, existing.rows[0].id],
    );
  } else {
    await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity, unit_price_snapshot)
       VALUES ($1, $2, $3, $4)`,
      [cartId, product.id, quantity, product.price],
    );
  }
}

export async function getCartItems(cartId: string): Promise<CartItem[]> {
  const { rows } = await pool.query<CartItem>(
    `SELECT ci.id, ci.cart_id, ci.product_id, ci.quantity, ci.unit_price_snapshot, p.name
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1
     ORDER BY ci.created_at ASC`,
    [cartId],
  );
  return rows;
}

export async function getCartTotal(cartId: string): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(quantity * unit_price_snapshot), 0) AS total
     FROM cart_items WHERE cart_id = $1`,
    [cartId],
  );
  return Number(rows[0].total);
}

export async function removeFromCart(
  cartId: string,
  productId: string,
): Promise<void> {
  await pool.query(
    `DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
    [cartId, productId],
  );
}

export async function clearCart(cartId: string): Promise<void> {
  await pool.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
}
