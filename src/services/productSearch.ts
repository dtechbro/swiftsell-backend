import { pool } from "../db/client";

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number;
  stock_qty: number;
  image_url: string | null;
}

// Naive but effective for small catalogs: keyword match on name/description,
// optional price ceiling parsed from the query.
export async function searchProducts(
  vendorId: string,
  rawQuery: string,
): Promise<Product[]> {
  const priceMatch = rawQuery.match(/under\s*(?:₦|ngn)?\s*([\d,]+)/i);
  const maxPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null;

  // strip price phrase out, keep remaining words as keywords
  const cleaned = rawQuery.replace(/under\s*(?:₦|ngn)?\s*[\d,]+/i, "").trim();
  const keywords = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 2) // drop tiny stopword-ish tokens
    .slice(0, 5); // cap, avoid runaway query size

  if (keywords.length === 0 && !maxPrice) {
    // no usable signal — return active products, most recent first
    const { rows } = await pool.query<Product>(
      `SELECT * FROM products WHERE vendor_id = $1 AND is_active = true AND stock_qty > 0
       ORDER BY created_at DESC LIMIT 5`,
      [vendorId],
    );
    return rows;
  }

  const conditions: string[] = [
    "vendor_id = $1",
    "is_active = true",
    "stock_qty > 0",
  ];
  const params: any[] = [vendorId];
  let idx = 2;

  if (keywords.length > 0) {
    const likeClauses = keywords.map((kw) => {
      params.push(`%${kw}%`);
      return `(name ILIKE $${idx} OR description ILIKE $${idx++})`;
    });
    conditions.push(`(${likeClauses.join(" OR ")})`);
  }

  if (maxPrice) {
    params.push(maxPrice);
    conditions.push(`price <= $${idx++}`);
  }

  const { rows } = await pool.query<Product>(
    `SELECT * FROM products WHERE ${conditions.join(" AND ")} ORDER BY price ASC LIMIT 5`,
    params,
  );
  return rows;
}
