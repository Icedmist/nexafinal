import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import imageCompression from "browser-image-compression";

export type UploadPath = "user_profiles" | "products" | "branches";

export interface UploadResult {
  url: string;
  path: string;
}

const compressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
};

export const uploadImage = async (
  file: File,
  path: UploadPath,
  fileName?: string
): Promise<UploadResult> => {
  try {
    // 1. Compress image
    const compressedFile = await imageCompression(file, compressionOptions);

    // 2. Create storage reference
    const name = fileName || `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${path}/${name}`);

    // 3. Upload
    await uploadBytes(storageRef, compressedFile);

    // 4. Get URL
    const url = await getDownloadURL(storageRef);

    return {
      url,
      path: storageRef.fullPath,
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};
