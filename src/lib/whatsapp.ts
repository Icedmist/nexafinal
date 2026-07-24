import type { SaleTransaction } from "@/types/inventory";
import { format } from "date-fns";

const NAIRA = "₦";

export function formatNaira(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

/**
 * Generates a WhatsApp URL for a specific phone number and message.
 * Handles Nigerian phone number normalization.
 */
export function getWhatsAppUrl(phone: string, text: string): string {
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, "");
  
  // Normalize to International format (Nigeria +234)
  let waPhone = cleaned;
  if (waPhone.startsWith("0")) {
    waPhone = "234" + waPhone.slice(1);
  } else if (waPhone.length === 10 && !waPhone.startsWith("234")) {
    waPhone = "234" + waPhone;
  } else if (waPhone.length === 11 && waPhone.startsWith("234")) {
    // Already in correct format
  } else if (waPhone.length === 7 || waPhone.length === 8) {
    waPhone = "234" + waPhone;
  }

  return `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Builds a personalized receipt message for WhatsApp.
 */
export function buildPersonalizedReceiptText(sale: SaleTransaction, storeName: string): string {
  const lines: string[] = [];
  
  // Personalized Greeting
  if (sale.customerName && sale.customerName !== "Walk-in" && sale.customerName !== "Unknown") {
    lines.push(`Hello *${sale.customerName}*,`);
    lines.push(`This is your digital receipt from *${storeName}*. Thank you for your purchase!`);
  } else {
    lines.push(`Hello, thank you for shopping at *${storeName}*!`);
    lines.push("Here is your digital receipt:");
  }
  
  lines.push("");
  lines.push(`*Receipt:* #${sale.id.slice(-8).toUpperCase()}`);
  lines.push(`*Date:* ${format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}`);
  lines.push("");
  lines.push("*Items:*");
  
  sale.items.forEach((li) => {
    const unitText = li.unit && li.unit !== "pcs" ? ` ${li.unit}` : "";
    lines.push(`• ${li.itemName} (${li.quantity}${unitText}) - ${formatNaira(li.unitPriceNgn * li.quantity)}`);
  });
  
  lines.push("");
  lines.push(`*TOTAL AMOUNT: ${formatNaira(sale.totalNgn)}*`);
  lines.push("─────────────────");
  lines.push("");
  lines.push("We appreciate your business! If you have any questions, feel free to message us here.");
  
  return lines.join("\n");
}
