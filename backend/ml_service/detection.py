"""
detection.py — Unified vehicle detector (Fix 3)
------------------------------------------------
Standardised to yolov8m.pt at conf=0.25 (Person 1's more-accurate model).
All bboxes are output as xywh (Person 2 pipeline format).
OpenCV BGSub fallback is kept for environments without ultralytics.
"""
import cv2
import numpy as np

# COCO Vehicle Class IDs for YOLO (2: car, 3: motorcycle, 5: bus, 7: truck)
VEHICLE_CLASS_IDS = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}

# ── Standardised defaults (Fix 3) ───────────────────────────────────────────
DEFAULT_MODEL      = "yolov8m.pt"   # was yolov8n.pt in Person-2 — medium is more accurate
DEFAULT_CONFIDENCE = 0.25           # balanced: Person-1=0.15 (too low), Person-2=0.35 (too high)


class VehicleDetector:
    def __init__(self, model_name=DEFAULT_MODEL, confidence_threshold=DEFAULT_CONFIDENCE):
        self.conf_thresh = confidence_threshold
        self.yolo_model  = None
        self.use_yolo    = False

        try:
            from ultralytics import YOLO
            self.yolo_model = YOLO(model_name)
            self.use_yolo   = True
            print(f"[Detector] Loaded YOLO model: {model_name} (conf≥{confidence_threshold})")
        except Exception as e:
            print(f"[Detector] YOLO unavailable ({e}). Using OpenCV BGSub fallback.")
            self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(
                history=500, varThreshold=50, detectShadows=True
            )

    def detect_vehicles(self, frame) -> list[dict]:
        """
        Detect vehicles in frame.
        Returns list of dicts: [{'bbox': [x, y, w, h], 'label': str, 'conf': float}]
        All bboxes are xywh — compatible with Person-2 tracker / pipeline.
        """
        detections = []

        if self.use_yolo and self.yolo_model is not None:
            results = self.yolo_model(frame, imgsz=320, conf=self.conf_thresh, verbose=False)[0]
            for box in results.boxes:
                cls_id = int(box.cls[0])
                conf   = float(box.conf[0])
                if cls_id in VEHICLE_CLASS_IDS and conf >= self.conf_thresh:
                    # Person-1 native format is xyxy → convert to xywh (Fix 2 partial)
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    detections.append({
                        "bbox":  [x1, y1, x2 - x1, y2 - y1],  # xywh
                        "label": VEHICLE_CLASS_IDS[cls_id],
                        "conf":  conf,
                    })
        else:
            fg_mask = self.bg_subtractor.apply(frame)
            _, thresh = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area > 1200:
                    x, y, bw, bh = cv2.boundingRect(cnt)
                    label = "car" if bw * bh < 10000 else "bus"
                    detections.append({"bbox": [x, y, bw, bh], "label": label, "conf": 0.75})

        return detections

    def crop_plate_region(self, frame, vehicle_bbox):
        """Estimate and crop lower 40% of vehicle bounding box for license plate detection."""
        x, y, w, h = vehicle_bbox
        plate_y = int(y + h * 0.55)
        plate_h = int(h * 0.45)
        plate_x = int(x + w * 0.10)
        plate_w = int(w * 0.80)

        frame_h, frame_w = frame.shape[:2]
        px1, py1 = max(0, plate_x), max(0, plate_y)
        px2, py2 = min(frame_w, plate_x + plate_w), min(frame_h, plate_y + plate_h)

        if px2 > px1 and py2 > py1:
            return frame[py1:py2, px1:px2], [px1, py1, px2 - px1, py2 - py1]
        return None, None
