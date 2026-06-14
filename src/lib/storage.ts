import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import imageCompression from "browser-image-compression";

export type UploadPath = "user_profiles" | "products" | "branches" | "refunds";

export interface UploadResult {
  url: string;
  path: string;
}

const compressionOptions = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
};

const sanitizeFileName = (fileName: string): string => {
  // Extract extension
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? parts.pop() : "";
  const baseName = parts.join(".");

  // Sanitize baseName: keep only alphanumeric, dashes, and underscores
  // Replace everything else with underscores
  const cleanBase = baseName
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

  return extension ? `${cleanBase}.${extension}` : cleanBase;
};

export const uploadImage = async (
  file: File,
  path: UploadPath,
  fileName?: string
): Promise<UploadResult> => {
  try {
    // 1. Compress image
    const compressedFile = await imageCompression(file, compressionOptions);

    // 2. Create storage reference with sanitized name
    const rawName = fileName || file.name;
    const sanitizedName = sanitizeFileName(rawName);
    const finalName = `${Date.now()}_${sanitizedName}`;
    
    const storageRef = ref(storage, `${path}/${finalName}`);

    // 3. Upload
    console.log(`Uploading to: ${storageRef.fullPath}`);
    await uploadBytes(storageRef, compressedFile);

    // 4. Get URL
    const url = await getDownloadURL(storageRef);

    return {
      url,
      path: storageRef.fullPath,
    };
  } catch (error) {
    console.error("Detailed error uploading image:", {
      error,
      fileName: file.name,
      path,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
};
