"""
app/routers/camera_ws.py — Per-camera WebSocket video stream endpoint.

WebSocket path: /ws/camera/{camera_id}

Payload sent to clients each frame:
{
    "camera_id": "CAM-001",
    "frame": "data:image/jpeg;base64,...",
    "metadata": {
        "vehicle_count": int,
        "detections": [...],
        "alerts": [...]       ← each alert also broadcast via REST alert manager
    }
}

Alert shape in alerts list (matches AlertCreate schema):
{
    "type": str,
    "severity": str,
    "camera_id": str,
    "vehicle_id": str,
    "plate_number": str,
    "timestamp": str,
}
"""

import asyncio
import base64
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.ml_bridge import get_pipeline, ML_AVAILABLE
from app.mock_data import MOCK_ALERTS
from app.websocket import manager

router = APIRouter()

# ---------------------------------------------------------------------------
# Synthetic frame generator (used when no camera hardware / YOLO available)
# ---------------------------------------------------------------------------

def _generate_synthetic_frame(camera_id: str, frame_num: int):
    """Create an animated traffic scene frame for demo purposes."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        return None

    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Road
    cv2.rectangle(img, (100, 0), (540, 480), (50, 50, 50), -1)
    # Lane dividers
    for y in range(0, 480, 40):
        cv2.line(img, (320, y), (320, y + 20), (255, 255, 255), 2)

    v1_y = (frame_num * 5) % 480
    v2_y = (480 - (frame_num * 7) % 480)

    cv2.rectangle(img, (180, v1_y), (250, v1_y + 90), (0, 165, 255), -1)
    cv2.putText(img, "KA01AB1234", (185, v1_y + 45),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    cv2.rectangle(img, (380, v2_y), (450, v2_y + 100), (200, 50, 50), -1)
    cv2.putText(img, "MH14EB9999", (385, v2_y + 50),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    # Camera label
    cv2.rectangle(img, (0, 0), (640, 30), (20, 20, 20), -1)
    cv2.putText(img, f"[SYNTHETIC] {camera_id} | Frame {frame_num}",
                (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 1)

    return img


def _frame_to_b64(frame) -> str:
    """Encode an OpenCV frame to a base64 JPEG data-URI string."""
    if frame is None:
        return ""
    try:
        import cv2
        _, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
        return "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")
    except Exception:
        return ""


async def _persist_and_broadcast_alerts(alerts: list):
    """Save ML-generated alerts to MOCK_ALERTS and broadcast over WebSocket."""
    for alert in alerts:
        new_alert = {
            "id": f"ALT-{uuid.uuid4().hex[:6].upper()}",
            "type": alert.get("type", "unknown"),
            "severity": alert.get("severity", "warning"),
            "vehicle_id": alert.get("vehicle_id"),
            "plate_number": alert.get("plate_number"),
            "camera_id": alert.get("camera_id"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "active",
        }
        MOCK_ALERTS.append(new_alert)
        await manager.broadcast({"event": "new_alert", "data": new_alert})


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@router.websocket("/ws/camera/{camera_id}")
async def websocket_camera_feed(websocket: WebSocket, camera_id: str):
    """
    Streams processed video frames for the given camera_id.
    Uses real YOLO/ANPR pipeline when ML deps are available;
    falls back to animated synthetic frames otherwise.
    """
    await websocket.accept()

    pipeline = get_pipeline(camera_id)   # None in mock mode

    # Open AICity dataset video for this camera
    cap = None
    if ML_AVAILABLE:
        try:
            import cv2
            import os
            root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            cam_digits = "".join(filter(str.isdigit, camera_id))
            video_path = None
            dataset_dir = os.path.join(root_dir, "data", "vehicle_reid_dataset")
            if cam_digits:
                c_name = f"c{int(cam_digits):03d}"
                for sub in ["train/S01", "validation/S02", "train/S03", "train/S04", "validation/S05", "test/S06"]:
                    candidate = os.path.join(dataset_dir, sub, c_name, "vdo.avi")
                    if os.path.exists(candidate):
                        video_path = candidate
                        break
            if not video_path:
                default_vdo = os.path.join(dataset_dir, "train", "S01", "c001", "vdo.avi")
                if os.path.exists(default_vdo):
                    video_path = default_vdo

            if video_path and os.path.exists(video_path):
                cap = cv2.VideoCapture(video_path)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 2000)
                offset = (abs(hash(camera_id)) * 73) % max(1, total_frames - 200)
                cap.set(cv2.CAP_PROP_POS_FRAMES, offset)
        except Exception:
            cap = None

    frame_count = 0
    try:
        while True:
            # --- Acquire frame ---
            frame = None
            if cap and cap.isOpened():
                try:
                    import cv2
                    ret, frame = cap.read()
                    if not ret:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, frame = cap.read()
                except Exception:
                    frame = None

            if frame is None:
                frame = _generate_synthetic_frame(camera_id, frame_count)

            # --- Process frame ---
            metadata: dict = {
                "camera_id": camera_id,
                "vehicle_count": 0,
                "detections": [],
                "alerts": [],
            }

            if pipeline is not None:
                try:
                    frame, metadata = pipeline.process_frame(frame)
                    # Persist & broadcast any new alerts
                    if metadata.get("alerts"):
                        await _persist_and_broadcast_alerts(metadata["alerts"])
                except Exception as exc:
                    print(f"[CameraWS] Pipeline error on {camera_id}: {exc}")

            frame_count += 1

            # --- Encode & send ---
            b64_frame = _frame_to_b64(frame)
            payload = {
                "camera_id": camera_id,
                "frame": b64_frame,
                "metadata": {
                    "vehicle_count": metadata.get("vehicle_count", 0),
                    "detections": metadata.get("detections", []),
                    "alerts": metadata.get("alerts", []),
                },
            }

            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(0.04)  # ~25 FPS cap

    except WebSocketDisconnect:
        print(f"[CameraWS] Client disconnected from {camera_id}")
    except Exception as exc:
        print(f"[CameraWS] Unexpected error on {camera_id}: {exc}")
    finally:
        if cap:
            try:
                cap.release()
            except Exception:
                pass
