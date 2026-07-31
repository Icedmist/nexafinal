// Simple QR code helpers for the bulk QR generator
export function generateQRCodeSVG(text: string): string {
  // Use a simple QR API service URL
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
}

export function getQRCodeText(itemId: string): string {
  return `${window.location.origin}/scan/${itemId}`;
}
