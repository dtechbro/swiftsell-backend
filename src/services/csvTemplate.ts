export function generateProductTemplate(): string {
  const header = "name,description,price,stock_qty,image_url";
  const example =
    "Red Ankara Dress,Size M-L cotton dress,12000,5,https://example.com/dress.jpg";
  return `${header}\n${example}\n`;
}
