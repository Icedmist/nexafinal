import { generateQRCodeSVG, getQRCodeText } from "@/components/catalog/QRCodeGenerator";
import type { Item } from "@/types/inventory";

export async function exportItemsQRCodes(items: Item[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const qrSize = 40;
  const padding = 10;
  const itemsPerRow = Math.floor((pageWidth - 2 * margin) / (qrSize + padding));
  const rowsPerPage = Math.floor((pageHeight - 2 * margin) / (qrSize + padding + 10)); // 10 for text
  
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
    const qrUrl = generateQRCodeSVG(qrText);
    
    // Fetch image as blob then draw to canvas to get data URL for PDF
    // Since jspdf doesn't support SVG directly well without extra plugins
    const imgData = await fetchQRCodeAsDataUrl(qrUrl);
    
    doc.addImage(imgData, "PNG", x, y, qrSize, qrSize);
    
    doc.setFontSize(8);
    doc.text(item.name.slice(0, 25), x + qrSize / 2, y + qrSize + 4, { align: "center" });
    doc.setFontSize(6);
    doc.text(item.sku, x + qrSize / 2, y + qrSize + 8, { align: "center" });

    count++;
    if (count % itemsPerRow === 0) {
      x = margin;
      y += qrSize + padding + 10;
    } else {
      x += qrSize + padding;
    }
  }

  doc.save("nexa-qr-codes.pdf");
}

async function fetchQRCodeAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 300, 300);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Canvas context failed"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}
