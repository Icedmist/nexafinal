import { getQRCodeText } from "@/components/catalog/QRCodeGenerator";
import type { Item } from "@/types/inventory";
import { toast } from "sonner";

export async function exportItemsQRCodes(items: Item[]) {
  if (items.length === 0) {
    toast.error("No items selected for QR export");
    return;
  }

  const toastId = toast.loading(`Generating QR codes for ${items.length} items...`);
  
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const qrSize = 40;
    const padding = 10;
    const itemsPerRow = Math.floor((pageWidth - 2 * margin) / (qrSize + padding));
    const rowsPerPage = Math.floor((pageHeight - 2 * margin) / (qrSize + padding + 12)); // Added more space for text
    
    let x = margin;
    let y = margin;
    let count = 0;

    for (const item of items) {
      if (count > 0 && count % (itemsPerRow * rowsPerPage) === 0) {
        doc.addPage();
        x = margin;
        y = margin;
      }

      const qrText = getQRCodeText(item.id);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrText)}`;
      
      try {
        const imgData = await fetchQRCodeAsDataUrl(qrUrl);
        doc.addImage(imgData, "PNG", x, y, qrSize, qrSize);
        
        doc.setFontSize(8);
        doc.text(item.name.slice(0, 25), x + qrSize / 2, y + qrSize + 4, { align: "center" });
        doc.setFontSize(6);
        doc.text(item.sku, x + qrSize / 2, y + qrSize + 8, { align: "center" });

        count++;
        if (count % itemsPerRow === 0) {
          x = margin;
          y += qrSize + padding + 12;
        } else {
          x += qrSize + padding;
        }
      } catch (err) {
        console.error(`Failed to fetch QR for ${item.name}:`, err);
        // Continue with other items even if one fails
      }
    }

    if (count > 0) {
      doc.save(`nexa-qr-codes-${new Date().getTime()}.pdf`);
      toast.success(`Successfully generated ${count} QR codes`, { id: toastId });
    } else {
      toast.error("Failed to generate any QR codes", { id: toastId });
    }
  } catch (error) {
    console.error("Bulk QR Error:", error);
    toast.error("An error occurred while generating PDF", { id: toastId });
  }
}

async function fetchQRCodeAsDataUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch QR code");
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("QR Fetch Error:", error);
    throw error;
  }
}

export async function downloadItemQRCode(item: Item) {
  const qrText = getQRCodeText(item.id);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrText)}`;
  const toastId = toast.loading(`Preparing QR code for ${item.name}...`);
  try {
    const response = await fetch(qrUrl);
    if (!response.ok) throw new Error("Failed to fetch QR code");
    const blob = await response.blob();
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${item.sku || "product"}.png`;
    a.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    toast.success("QR code downloaded successfully!", { id: toastId });
  } catch (error) {
    console.error("QR Download Error:", error);
    toast.error("Failed to download QR code", { id: toastId });
  }
}
