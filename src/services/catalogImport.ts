import { parse } from "csv-parse/sync";

export interface ParsedProductRow {
  name: string;
  description: string | null;
  price: number;
  stock_qty: number;
  image_url: string | null;
}

export interface ImportResult {
  valid: ParsedProductRow[];
  errors: { row: number; reason: string }[];
}

export function parseProductCsv(csvText: string): ImportResult {
  const records: Record<string, string>[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const valid: ParsedProductRow[] = [];
  const errors: { row: number; reason: string }[] = [];

  records.forEach((row, i) => {
    const rowNum = i + 2; // +2: header is row 1, arrays are 0-indexed

    if (!row.name || row.name.trim() === "") {
      errors.push({ row: rowNum, reason: "Missing product name" });
      return;
    }

    const price = Number(row.price);
    if (!row.price || isNaN(price) || price <= 0) {
      errors.push({ row: rowNum, reason: `Invalid price "${row.price}"` });
      return;
    }

    const stockQty = row.stock_qty ? Number(row.stock_qty) : 0;
    if (isNaN(stockQty) || stockQty < 0) {
      errors.push({
        row: rowNum,
        reason: `Invalid stock_qty "${row.stock_qty}"`,
      });
      return;
    }

    valid.push({
      name: row.name.trim(),
      description: row.description?.trim() || null,
      price,
      stock_qty: stockQty,
      image_url: row.image_url?.trim() || null,
    });
  });

  return { valid, errors };
}
