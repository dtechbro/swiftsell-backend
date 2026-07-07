import { VendorOrderDetails } from "../db/queries";

function formatMoney(value: number): string {
  return `NGN ${value.toLocaleString()}`;
}

function buyerHandle(order: VendorOrderDetails): string {
  return order.buyerUsername ? `@${order.buyerUsername}` : "No username";
}

function formatDate(value: string | null): string {
  if (!value) return "Not available";
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatOrderNotification(order: VendorOrderDetails): string {
  const items =
    order.items.length > 0
      ? order.items
          .map(
            (item) =>
              `- ${item.quantity}x ${item.name} (${formatMoney(Number(item.unitPrice))})`,
          )
          .join("\n")
      : "- No line items found";

  return [
    "New paid order",
    `Reference: ${order.orderReference}`,
    `Total: ${formatMoney(order.totalAmount)}`,
    `Buyer: ${buyerHandle(order)}`,
    `Buyer Telegram ID: ${order.buyerTelegramId}`,
    `Buyer email: ${order.buyerEmail ?? "Not provided"}`,
    `Paid at: ${formatDate(order.paidAt)}`,
    "",
    "Items:",
    items,
  ].join("\n");
}

export function formatOrdersList(orders: VendorOrderDetails[]): string {
  if (orders.length === 0) {
    return "No orders yet. Paid orders will show up here once checkout succeeds.";
  }

  const chunks = orders.map((order, index) => {
    const itemSummary =
      order.items.length > 0
        ? order.items
            .map((item) => `${item.quantity}x ${item.name}`)
            .join(", ")
        : "No line items found";

    return [
      `${index + 1}. ${formatMoney(order.totalAmount)} - ${order.status}`,
      `Ref: ${order.orderReference}`,
      `Buyer: ${buyerHandle(order)} (${order.buyerTelegramId})`,
      `Email: ${order.buyerEmail ?? "Not provided"}`,
      `Paid: ${formatDate(order.paidAt)}`,
      `Items: ${itemSummary}`,
    ].join("\n");
  });

  return ["Recent orders", ...chunks].join("\n\n");
}
