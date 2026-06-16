import os
import glob
try:
    from PIL import Image
    import pytesseract
    pytesseract_available = True
except ImportError:
    pytesseract_available = False

print(f"Pytesseract available: {pytesseract_available}")

image_dir = "/home/snow/Music/nexa-new"
images = sorted(glob.glob(os.path.join(image_dir, "*.jpg")))
print(f"Found {len(images)} images.")

for img_path in images:
    basename = os.path.basename(img_path)
    print(f"\n--- {basename} ---")
    if pytesseract_available:
        try:
            text = pytesseract.image_to_string(Image.open(img_path))
            print(text.strip())
        except Exception as e:
            print(f"Error OCR'ing {basename}: {e}")
    else:
        print("Pytesseract not available to perform OCR")
