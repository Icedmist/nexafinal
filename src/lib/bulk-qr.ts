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
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Use anonymous to avoid CORS taint if server supports it
    img.crossOrigin = "anonymous";
    
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error("QR Code fetch timed out"));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 300, 300);
        ctx.drawImage(img, 0, 0);
        try {
          const dataUrl = canvas.toDataURL("image/png");
          resolve(dataUrl);
        } catch (e) {
          reject(new Error("Canvas tainted by CORS"));
        }
      } else {
        reject(new Error("Canvas context failed"));
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Failed to load QR image source"));
    };
    
    img.src = url;
  });
}
