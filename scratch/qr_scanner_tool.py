import cv2
from pyzbar import pyzbar
import time

def scan_qr():
    """
    Scans QR codes using the default camera.
    Requires opencv-python and pyzbar.
    Install with: pip install opencv-python pyzbar
    """
    print("Starting QR Scanner... Press 'q' to quit.")
    
    # Initialize the camera
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return

    while True:
        # Capture frame-by-frame
        ret, frame = cap.read()
        if not ret:
            print("Error: Failed to capture frame.")
            break

        # Decode QR codes
        barcodes = pyzbar.decode(frame)
        
        for barcode in barcodes:
            # Extract data and type
            data = barcode.data.decode("utf-8")
            barcode_type = barcode.type
            
            print(f"[{barcode_type}] Scanned Data: {data}")
            
            # Optional: Draw a rectangle around the QR code
            (x, y, w, h) = barcode.rect
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(frame, data, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        # Display the resulting frame
        cv2.imshow('Nexa QR Scanner (Python Alternative)', frame)

        # Break the loop on 'q' key press
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Release the camera and close windows
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    try:
        scan_qr()
    except ImportError:
        print("Required libraries missing. Please run: pip install opencv-python pyzbar")
    except Exception as e:
        print(f"An error occurred: {e}")
