export type ParsedCallback =
  | { action: "add"; productId: string }
  | { action: "remove"; productId: string }
  | { action: "checkout" }
  | { action: "cart" };

export function parseCallbackData(data: string): ParsedCallback | null {
  if (data === "checkout") return { action: "checkout" };
  if (data === "cart") return { action: "cart" };
  if (data.startsWith("add:"))
    return { action: "add", productId: data.slice(4) };
  if (data.startsWith("remove:"))
    return { action: "remove", productId: data.slice(7) };
  return null;
}
