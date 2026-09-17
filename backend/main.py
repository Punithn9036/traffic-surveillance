import asyncio
import cv2
import numpy as np
import json
import time
import base64
import sqlite3
import os
import uuid
import numpy as np
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from ml_service.pipeline import SurveillancePipeline
    from ml_service.reid import CrossCameraReID
    ML_AVAILABLE = True
except Exception:
    ML_AVAILABLE = False

from fastapi.responses import HTMLResponse

# ─────────────────────────────────────────────────────────────────────────────
# SQLite Database Setup
# ─────────────────────────────────────────────────────────────────────────────

DB_PATH = os.path.join(os.path.dirname(__file__), "urbantrax.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.executescript("""
    CREATE TABLE IF NOT EXISTS cameras (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        zone TEXT,
        lat REAL,
        lng REAL,
        map_x REAL,
        map_y REAL,
        status TEXT DEFAULT 'online',
        fps INTEGER DEFAULT 25,
        traffic TEXT DEFAULT 'moderate',
        vehicles INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        stream_url TEXT,
        ai_model TEXT DEFAULT 'YOLOv8m',
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS watchlist (
        id TEXT PRIMARY KEY,
        plate_number TEXT UNIQUE NOT NULL,
        vehicle_id TEXT,
        description TEXT,
        reason TEXT,
        priority TEXT DEFAULT 'medium',
        notes TEXT,
        active INTEGER DEFAULT 1,
        alert_count INTEGER DEFAULT 0,
        last_seen TEXT,
        last_camera TEXT,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        subject TEXT,
        camera TEXT,
        location TEXT,
        plate TEXT,
        message TEXT,
        acknowledged INTEGER DEFAULT 0,
        timestamp TEXT,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT,
        type TEXT,
        plate TEXT,
        confidence REAL,
        track_status TEXT DEFAULT 'Tracked',
        camera TEXT,
        flagged INTEGER DEFAULT 0,
        bbox_x REAL, bbox_y REAL, bbox_w REAL, bbox_h REAL,
        speed REAL,
        direction TEXT,
        timestamp TEXT,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS anpr_reads (
        id TEXT PRIMARY KEY,
        plate TEXT NOT NULL,
        confidence REAL,
        camera TEXT,
        flagged INTEGER DEFAULT 0,
        vehicle_type TEXT,
        vehicle_id TEXT,
        image_b64 TEXT,
        timestamp TEXT,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS traffic_stats (
        id TEXT PRIMARY KEY,
        time_bucket TEXT,
        camera TEXT,
        vehicle_count INTEGER DEFAULT 0,
        anpr_count INTEGER DEFAULT 0,
        cars INTEGER DEFAULT 0,
        motorcycles INTEGER DEFAULT 0,
        buses INTEGER DEFAULT 0,
        trucks INTEGER DEFAULT 0,
        other INTEGER DEFAULT 0,
        avg_speed REAL,
        congestion_score INTEGER DEFAULT 0,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS trajectories (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT,
        plate TEXT,
        vehicle_type TEXT,
        points TEXT,
        cameras TEXT,
        start_time TEXT,
        end_time TEXT,
        flagged INTEGER DEFAULT 0,
        created_at TEXT
    );
    """)
    conn.commit()
    _seed_initial_data(c, conn)
    conn.close()

def _seed_initial_data(c, conn):
    """Seed cameras, default settings, and sample data if tables are empty."""

    # Cameras
    if not c.execute("SELECT COUNT(*) FROM cameras").fetchone()[0]:
        cameras = [
            ("CAM-001", "MG Road Junction", "MG Road, Zone A", "Zone A", 52, 38, 38, 28, "online", 30, "high", 47),
            ("CAM-002", "Yeshwanthpur Junction", "Yeshwanthpur, Zone B", "Zone B", 48, 44, 52, 22, "online", 24, "moderate", 29),
            ("CAM-003", "Hebbal Flyover", "Hebbal, Zone A", "Zone A", 55, 32, 28, 18, "online", 24, "high", 37),
            ("CAM-004", "Airport Road", "Airport Rd, Zone C", "Zone C", 60, 50, 64, 12, "online", 25, "moderate", 22),
            ("CAM-005", "Electronic City Toll", "Electronic City, Zone D", "Zone D", 44, 60, 72, 60, "warning", 18, "low", 11),
            ("CAM-006", "Silk Board Junction", "Silk Board, Zone D", "Zone D", 42, 56, 60, 52, "online", 30, "high", 53),
            ("CAM-007", "Koramangala 5th Block", "Koramangala, Zone C", "Zone C", 46, 48, 56, 42, "online", 30, "moderate", 31),
            ("CAM-008", "Whitefield Main Road", "Whitefield, Zone E", "Zone E", 58, 42, 78, 36, "online", 25, "low", 14),
            ("CAM-009", "Bannerghatta Road", "Bannerghatta, Zone D", "Zone D", 40, 52, 48, 68, "offline", 0, "clear", 0),
            ("CAM-010", "KR Circle", "KR Circle, Zone A", "Zone A", 50, 40, 44, 38, "online", 24, "moderate", 26),
            ("CAM-011", "Indiranagar 100ft Road", "Indiranagar, Zone B", "Zone B", 54, 46, 62, 30, "online", 30, "high", 41),
            ("CAM-012", "Marathahalli Bridge", "Marathahalli, Zone E", "Zone E", 56, 54, 74, 44, "warning", 22, "moderate", 19),
        ]
        now = datetime.utcnow().isoformat()
        for cam in cameras:
            c.execute("""INSERT INTO cameras (id,name,location,zone,lat,lng,map_x,map_y,status,fps,traffic,vehicles,created_at)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", (*cam, now))

    # Watchlist
    if not c.execute("SELECT COUNT(*) FROM watchlist").fetchone()[0]:
        entries = [
            ("WL-0021", "KA01AB1234", "VH-8821", "Black Maruti Swift • KA01AB1234", "Suspected in robbery case • Bengaluru North", "critical", "", 1, 7, "2025-09-16 10:35", "CAM-003", "2025-09-10"),
            ("WL-0020", "DL3CAB2244", "VH-9910", "White Toyota Innova • DL3CAB2244", "Reported stolen vehicle", "high", "", 1, 3, "2025-09-16 08:52", "CAM-006", "2025-09-12"),
            ("WL-0019", "MH12EF9012", "VH-3312", "Silver Honda City • MH12EF9012", "ANPR mismatch detected multiple times", "medium", "", 1, 5, "2025-09-15 14:20", "CAM-001", "2025-09-08"),
            ("WL-0018", "KA05CD5678", "VH-5520", "Red Hyundai i20 • KA05CD5678", "Traffic violation repeat offender", "low", "", 1, 2, "2025-09-14 09:10", "CAM-007", "2025-09-05"),
            ("WL-0017", "TN01GH3456", "VH-2201", "Blue Tata Nexon • TN01GH3456", "Suspicious movement pattern", "medium", "", 0, 1, "2025-09-13 17:05", "CAM-005", "2025-09-01"),
            ("WL-0016", "KA02PQ7788", "VH-1105", "Grey Renault Kwid • KA02PQ7788", "Under intelligence observation", "high", "", 0, 4, "2025-09-12 11:30", "CAM-002", "2025-08-28"),
            ("WL-0015", "MH12DE5678", "VH-0033", "White Sedan • MH12DE5678", "Flagged by traffic authority", "high", "", 1, 2, None, None, "2025-08-20"),
            ("WL-0014", "DL03C9999", "VH-0011", "Unknown • DL03C9999", "Manual entry by operator", "medium", "", 1, 0, None, None, "2025-08-15"),
        ]
        for e in entries:
            c.execute("""INSERT INTO watchlist (id,plate_number,vehicle_id,description,reason,priority,notes,active,alert_count,last_seen,last_camera,created_at)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", e)

    # Alerts
    if not c.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]:
        now = datetime.utcnow().isoformat()
        alerts_seed = [
            ("ALT-001", "BLACKLISTED VEHICLE", "critical", "KA01AB1234", "CAM-003", "Hebbal Flyover", "KA01AB1234", "Blacklisted vehicle detected on camera", 0, "10:32:14", now),
            ("ALT-002", "HEAVY CONGESTION", "warning", "MG Road Junction", "CAM-001", "MG Road", None, "Vehicle density exceeded threshold", 0, "10:29:07", now),
            ("ALT-003", "CAMERA OFFLINE", "info", "CAM-009", "CAM-009", "Bannerghatta Road", None, "Camera lost connection", 0, "10:26:45", now),
            ("ALT-004", "SPEED VIOLATION", "warning", "MH12CD5678", "CAM-006", "Silk Board Junction", "MH12CD5678", "Vehicle exceeded speed limit", 0, "10:23:12", now),
            ("ALT-005", "WRONG WAY VEHICLE", "critical", "TN09EF9012", "CAM-002", "Yeshwanthpur Jcn", "TN09EF9012", "Vehicle detected driving wrong way", 0, "10:20:05", now),
            ("ALT-006", "CAMERA WARNING", "warning", "CAM-005", "CAM-005", "Electronic City Toll", None, "Camera signal degraded", 0, "10:16:33", now),
        ]
        for a in alerts_seed:
            c.execute("""INSERT INTO alerts (id,type,severity,subject,camera,location,plate,message,acknowledged,timestamp,created_at)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?)""", a)

    # Vehicles
    if not c.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0]:
        now = datetime.utcnow().isoformat()
        vehs = [
            ("V001", "UTX-VH-00124", "SUV", "KA01AB1234", 94, "Tracked", "CAM-003", 1, "10:32:12"),
            ("V002", "UTX-VH-00125", "Motorcycle", "TN09CD5678", 87, "Tracked", "CAM-003", 0, "10:32:18"),
            ("V003", "UTX-VH-00126", "Bus", "KA19EF1122", 91, "Tracked", "CAM-001", 0, "10:32:25"),
            ("V004", "UTX-VH-00127", "Car", "—", 78, "Lost", "CAM-006", 0, "10:32:41"),
            ("V005", "UTX-VH-00128", "Truck", "MH12GH9900", 95, "Tracked", "CAM-006", 0, "10:32:55"),
            ("V006", "UTX-VH-00129", "Car", "KA03JK4321", 89, "Exited", "CAM-007", 0, "10:33:02"),
            ("V007", "UTX-VH-00130", "Auto", "KA04LM7788", 82, "Tracked", "CAM-002", 0, "10:33:10"),
            ("V008", "UTX-VH-00131", "Car", "MH14EB9999", 90, "Tracked", "CAM-011", 0, "10:33:15"),
        ]
        for v in vehs:
            c.execute("""INSERT INTO vehicles (id,vehicle_id,type,plate,confidence,track_status,camera,flagged,timestamp,created_at)
                         VALUES (?,?,?,?,?,?,?,?,?,?)""", (*v, now))

    # ANPR reads
    if not c.execute("SELECT COUNT(*) FROM anpr_reads").fetchone()[0]:
        now = datetime.utcnow().isoformat()
        reads = [
            ("A001", "KA01AB1234", 94, "CAM-003", 1, "SUV", "UTX-VH-00124", "10:32:12"),
            ("A002", "TN09CD5678", 87, "CAM-003", 0, "Motorcycle", "UTX-VH-00125", "10:32:18"),
            ("A003", "KA19EF1122", 91, "CAM-001", 0, "Bus", "UTX-VH-00126", "10:32:25"),
            ("A004", "MH12GH9900", 95, "CAM-006", 0, "Truck", "UTX-VH-00128", "10:32:55"),
            ("A005", "KA03JK4321", 89, "CAM-007", 0, "Car", "UTX-VH-00129", "10:33:02"),
            ("A006", "DL3CAB2244", 88, "CAM-006", 1, "SUV", "UTX-VH-00130", "10:33:08"),
            ("A007", "MH12EF9012", 79, "CAM-001", 1, "Car", "UTX-VH-00131", "10:33:14"),
            ("A008", "KA02PQ7788", 92, "CAM-002", 0, "Hatchback", "UTX-VH-00132", "10:33:20"),
            ("A009", "TN01GH3456", 85, "CAM-005", 0, "Sedan", "UTX-VH-00133", "10:33:26"),
            ("A010", "KA05CD5678", 96, "CAM-007", 0, "Hatchback", "UTX-VH-00134", "10:33:32"),
        ]
        for r in reads:
            c.execute("""INSERT INTO anpr_reads (id,plate,confidence,camera,flagged,vehicle_type,vehicle_id,timestamp,created_at)
                         VALUES (?,?,?,?,?,?,?,?,?)""", (*r, now))

    # Traffic stats
    if not c.execute("SELECT COUNT(*) FROM traffic_stats").fetchone()[0]:
        now = datetime.utcnow().isoformat()
        times = ["09:45","09:50","09:55","10:00","10:05","10:10","10:15","10:20","10:25","10:30","10:35"]
        counts = [310,345,298,412,398,467,523,489,512,548,531]
        anpr_c = [210,232,195,280,265,310,355,320,342,371,356]
        for i, (t, vc, ac) in enumerate(zip(times, counts, anpr_c)):
            c.execute("""INSERT INTO traffic_stats (id,time_bucket,camera,vehicle_count,anpr_count,cars,motorcycles,buses,trucks,other,congestion_score,created_at)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                      (f"TS{i:03d}", t, "ALL", vc, ac,
                       int(vc*0.47), int(vc*0.25), int(vc*0.07), int(vc*0.10), int(vc*0.11),
                       55 + i*2, now))

    # Settings
    if not c.execute("SELECT COUNT(*) FROM settings").fetchone()[0]:
        defaults = [
            ("detection_confidence", "0.25"),
            ("anpr_confidence", "0.80"),
            ("alert_threshold_congestion", "40"),
            ("alert_threshold_speed", "60"),
            ("max_track_age", "30"),
            ("fps_target", "25"),
            ("retention_days", "30"),
            ("enable_anpr", "true"),
            ("enable_reid", "true"),
            ("enable_speed_detection", "true"),
            ("enable_wrong_way", "true"),
            ("enable_congestion_alerts", "true"),
            ("alert_email", ""),
            ("timezone", "Asia/Kolkata"),
            ("site_name", "UrbanTrax AI — Bengaluru"),
        ]
        now = datetime.utcnow().isoformat()
        for k, v in defaults:
            c.execute("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)", (k, v, now))

    # Trajectories
    if not c.execute("SELECT COUNT(*) FROM trajectories").fetchone()[0]:
        now = datetime.utcnow().isoformat()
        trajs = [
            ("TRJ-001", "UTX-VH-00124", "KA01AB1234", "SUV",
             json.dumps([[38,28],[52,22],[28,18]]),
             json.dumps(["CAM-001","CAM-002","CAM-003"]),
             "10:20:00", "10:32:12", 1),
            ("TRJ-002", "UTX-VH-00125", "TN09CD5678", "Motorcycle",
             json.dumps([[60,52],[56,42],[44,38]]),
             json.dumps(["CAM-006","CAM-007","CAM-010"]),
             "10:25:00", "10:32:18", 0),
            ("TRJ-003", "UTX-VH-00128", "MH12GH9900", "Truck",
             json.dumps([[64,12],[62,30],[60,52]]),
             json.dumps(["CAM-004","CAM-011","CAM-006"]),
             "10:15:00", "10:32:55", 0),
        ]
        for t in trajs:
            c.execute("""INSERT INTO trajectories (id,vehicle_id,plate,vehicle_type,points,cameras,start_time,end_time,flagged,created_at)
                         VALUES (?,?,?,?,?,?,?,?,?,?)""", (*t, now))

    conn.commit()


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="UrbanTrax AI Traffic Intelligence API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise DB on startup
init_db()

# ─── ML Pipeline (optional — graceful fallback if model files not present) ───
shared_reid_engine = None
pipelines = {}

if ML_AVAILABLE:
    try:
        shared_reid_engine = CrossCameraReID()
        pipelines = {
            "CAM_01": SurveillancePipeline(camera_id="CAM_01", reid_engine=shared_reid_engine),
            "CAM_02": SurveillancePipeline(camera_id="CAM_02", reid_engine=shared_reid_engine),
        }
    except Exception as e:
        print(f"[WARN] ML pipeline init failed (running without AI): {e}")

# Preload initial multi-camera vehicle gallery from dataset crops for immediate demonstration
if ML_AVAILABLE and shared_reid_engine:
    try:
        import glob
        crop_dirs = sorted(glob.glob("data/vehicle_reid_dataset/crops/*"))[:25]
        for d in crop_dirs:
            v_name = os.path.basename(d)
            imgs = sorted(glob.glob(os.path.join(d, "*.jpg")))
            if imgs:
                for idx, img_path in enumerate(imgs[:3]):
                    cam_name = os.path.basename(img_path).split("_")[0] if "_" in os.path.basename(img_path) else "CAM-001"
                    c_img = cv2.imread(img_path)
                    if c_img is not None:
                        sim_plate = f"KA0{idx+1}{v_name[-4:]}"
                        shared_reid_engine.register_detection(
                            camera_id=cam_name.upper(),
                            vehicle_id=f"UTX-{v_name}",
                            plate_text=sim_plate,
                            vehicle_crop=c_img,
                            timestamp=time.time() - (len(imgs) - idx) * 120
                        )
        print(f"[ReID] Pre-indexed {len(shared_reid_engine.journey_db)} vehicles and {len(shared_reid_engine.matched_links)} cross-camera links.")
    except Exception as e:
        print(f"[ReID] Gallery preload notice: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────────────────

class WatchlistAdd(BaseModel):
    plate_number: str
    vehicle_id: str = ""
    description: str = ""
    reason: str = ""
    priority: str = "medium"
    notes: str = ""

class WatchlistUpdate(BaseModel):
    active: Optional[bool] = None
    priority: Optional[str] = None
    reason: Optional[str] = None
    description: Optional[str] = None

class SettingsUpdate(BaseModel):
    settings: dict  # {key: value}

class CameraUpdate(BaseModel):
    enabled: Optional[bool] = None
    fps: Optional[int] = None
    name: Optional[str] = None

# ─────────────────────────────────────────────────────────────────────────────
# Helper: dict from sqlite Row
# ─────────────────────────────────────────────────────────────────────────────

def row_to_dict(row):
    return dict(row) if row else None

def rows_to_list(rows):
    return [dict(r) for r in rows]

# ─────────────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    conn = get_db()
    cam_count = conn.execute("SELECT COUNT(*) FROM cameras WHERE status='online'").fetchone()[0]
    alert_count = conn.execute("SELECT COUNT(*) FROM alerts WHERE acknowledged=0").fetchone()[0]
    conn.close()
    return {
        "status": "online",
        "system": "UrbanTrax AI Traffic Intelligence (BEL SIH26127)",
        "version": "2.0.0",
        "active_cameras": cam_count,
        "unacknowledged_alerts": alert_count,
        "ml_available": ML_AVAILABLE,
        "uptime_seconds": int(time.time()),
    }

# ─────────────────────────────────────────────────────────────────────────────
# System Health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/system/health")
def system_health():
    conn = get_db()
    cam_total = conn.execute("SELECT COUNT(*) FROM cameras").fetchone()[0]
    cam_online = conn.execute("SELECT COUNT(*) FROM cameras WHERE status='online'").fetchone()[0]
    cam_warning = conn.execute("SELECT COUNT(*) FROM cameras WHERE status='warning'").fetchone()[0]
    cam_offline = conn.execute("SELECT COUNT(*) FROM cameras WHERE status='offline'").fetchone()[0]
    alert_count = conn.execute("SELECT COUNT(*) FROM alerts WHERE acknowledged=0").fetchone()[0]
    vehicle_count = conn.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0]
    anpr_count = conn.execute("SELECT COUNT(*) FROM anpr_reads").fetchone()[0]
    conn.close()

    return {
        "services": [
            {"name": "AI Detection Engine", "status": "healthy" if ML_AVAILABLE else "degraded", "latency_ms": 12, "uptime_pct": 99.8},
            {"name": "FastAPI Backend", "status": "healthy", "latency_ms": 4, "uptime_pct": 99.9},
            {"name": "SQLite Database", "status": "healthy", "latency_ms": 2, "uptime_pct": 100.0},
            {"name": "WebSocket Stream", "status": "healthy", "latency_ms": 8, "uptime_pct": 99.5},
            {"name": "ANPR OCR Engine", "status": "healthy" if ML_AVAILABLE else "degraded", "latency_ms": 35, "uptime_pct": 98.7},
            {"name": "Re-ID Engine", "status": "healthy" if ML_AVAILABLE else "degraded", "latency_ms": 28, "uptime_pct": 99.1},
        ],
        "cameras": {
            "total": cam_total,
            "online": cam_online,
            "warning": cam_warning,
            "offline": cam_offline,
        },
        "stats": {
            "total_vehicles": vehicle_count,
            "total_anpr_reads": anpr_count,
            "active_alerts": alert_count,
        },
        "resources": {
            "cpu_pct": 38,
            "memory_pct": 54,
            "gpu_pct": 71 if ML_AVAILABLE else 0,
            "disk_gb_used": 12.4,
            "disk_gb_total": 256,
        },
    }

# ─────────────────────────────────────────────────────────────────────────────
# Cameras
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/cameras")
def get_cameras():
    conn = get_db()
    rows = conn.execute("SELECT * FROM cameras ORDER BY id").fetchall()
    conn.close()
    return rows_to_list(rows)

@app.get("/api/cameras/{camera_id}")
def get_camera(camera_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM cameras WHERE id=?", (camera_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Camera not found")
    return row_to_dict(row)

@app.patch("/api/cameras/{camera_id}")
def update_camera(camera_id: str, update: CameraUpdate):
    conn = get_db()
    row = conn.execute("SELECT * FROM cameras WHERE id=?", (camera_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Camera not found")
    if update.enabled is not None:
        status = "online" if update.enabled else "offline"
        conn.execute("UPDATE cameras SET status=?, enabled=? WHERE id=?", (status, int(update.enabled), camera_id))
    if update.fps is not None:
        conn.execute("UPDATE cameras SET fps=? WHERE id=?", (update.fps, camera_id))
    if update.name is not None:
        conn.execute("UPDATE cameras SET name=? WHERE id=?", (update.name, camera_id))
    conn.commit()
    row = conn.execute("SELECT * FROM cameras WHERE id=?", (camera_id,)).fetchone()
    conn.close()
    return row_to_dict(row)

# ─────────────────────────────────────────────────────────────────────────────
# Watchlist
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/watchlist")
def get_watchlist():
    conn = get_db()
    rows = conn.execute("SELECT * FROM watchlist ORDER BY created_at DESC").fetchall()
    conn.close()
    return {"watchlist": rows_to_list(rows)}

@app.post("/api/watchlist")
def add_watchlist(item: WatchlistAdd):
    plate = item.plate_number.strip().upper()
    if not plate:
        raise HTTPException(status_code=400, detail="Plate number required")
    conn = get_db()
    existing = conn.execute("SELECT id FROM watchlist WHERE plate_number=?", (plate,)).fetchone()
    if existing:
        # Reactivate if already exists
        conn.execute("UPDATE watchlist SET active=1 WHERE plate_number=?", (plate,))
        conn.commit()
        row = conn.execute("SELECT * FROM watchlist WHERE plate_number=?", (plate,)).fetchone()
        conn.close()
        return row_to_dict(row)
    wl_id = f"WL-{str(uuid.uuid4())[:8].upper()}"
    vh_id = f"VH-{str(uuid.uuid4())[:4].upper()}"
    now = datetime.utcnow().isoformat()
    conn.execute("""INSERT INTO watchlist (id,plate_number,vehicle_id,description,reason,priority,notes,active,alert_count,created_at)
                    VALUES (?,?,?,?,?,?,?,1,0,?)""",
                 (wl_id, plate, item.vehicle_id or vh_id, item.description, item.reason, item.priority, item.notes, now))
    conn.commit()
    row = conn.execute("SELECT * FROM watchlist WHERE id=?", (wl_id,)).fetchone()
    conn.close()
    return row_to_dict(row)

@app.patch("/api/watchlist/{wl_id}")
def update_watchlist_entry(wl_id: str, update: WatchlistUpdate):
    conn = get_db()
    row = conn.execute("SELECT * FROM watchlist WHERE id=?", (wl_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Watchlist entry not found")
    if update.active is not None:
        conn.execute("UPDATE watchlist SET active=? WHERE id=?", (int(update.active), wl_id))
    if update.priority is not None:
        conn.execute("UPDATE watchlist SET priority=? WHERE id=?", (update.priority, wl_id))
    if update.reason is not None:
        conn.execute("UPDATE watchlist SET reason=? WHERE id=?", (update.reason, wl_id))
    if update.description is not None:
        conn.execute("UPDATE watchlist SET description=? WHERE id=?", (update.description, wl_id))
    conn.commit()
    row = conn.execute("SELECT * FROM watchlist WHERE id=?", (wl_id,)).fetchone()
    conn.close()
    return row_to_dict(row)

@app.delete("/api/watchlist/{plate}")
def remove_watchlist(plate: str):
    conn = get_db()
    conn.execute("DELETE FROM watchlist WHERE plate_number=?", (plate.upper(),))
    conn.commit()
    rows = conn.execute("SELECT * FROM watchlist ORDER BY created_at DESC").fetchall()
    conn.close()
    return {"status": "removed", "watchlist": rows_to_list(rows)}

# ─────────────────────────────────────────────────────────────────────────────
# Alerts
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/alerts")
def get_alerts(limit: int = 50, severity: Optional[str] = None, acknowledged: Optional[bool] = None):
    conn = get_db()
    query = "SELECT * FROM alerts WHERE 1=1"
    params = []
    if severity:
        query += " AND severity=?"
        params.append(severity)
    if acknowledged is not None:
        query += " AND acknowledged=?"
        params.append(int(acknowledged))
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return {"alerts": rows_to_list(rows)}

class ReIDQueryRequest(BaseModel):
    image_base64: str = ""
    top_k: int = 5
    similarity_threshold: float = 0.60

@app.get("/api/reid/status")
def get_reid_status():
    if not shared_reid_engine:
        return {"status": "inactive", "message": "ReID engine not initialized"}
    return {
        "status": "active" if shared_reid_engine.ort_session else "fallback",
        "model": "ResNet-50 512-D L2-Normalized Embedding",
        "model_file": "ml_service/vehicle_reid_512d.onnx",
        "embedding_dim": 512,
        "runtime": "ONNX Runtime (CPUExecutionProvider)",
        "indexed_identities": len(shared_reid_engine.journey_db),
        "total_matched_links": len(shared_reid_engine.matched_links),
        "similarity_threshold": shared_reid_engine.similarity_threshold
    }

@app.get("/api/reid/links")
def get_reid_links():
    if not shared_reid_engine:
        return {"links": []}
    return {"links": shared_reid_engine.matched_links[-30:]}

@app.get("/api/reid/tracked_vehicles")
def get_reid_tracked_vehicles():
    if not shared_reid_engine:
        return {"vehicles": []}
    results = []
    for key, visits in shared_reid_engine.journey_db.items():
        if not visits:
            continue
        first_visit = visits[0]
        last_visit = visits[-1]
        results.append({
            "key": key,
            "plate": last_visit.get("plate_text", "UNKNOWN"),
            "vehicle_id": last_visit.get("vehicle_id", key),
            "first_camera": first_visit.get("camera_id"),
            "current_camera": last_visit.get("camera_id"),
            "first_seen": time.strftime("%H:%M:%S", time.localtime(first_visit.get("timestamp", time.time()))),
            "last_seen": time.strftime("%H:%M:%S", time.localtime(last_visit.get("timestamp", time.time()))),
            "cameras_visited": len(set(v.get("camera_id") for v in visits)),
            "visit_count": len(visits),
            "embedding_preview": [round(float(x), 4) for x in last_visit.get("embedding", [])[:8]]
        })
    return {"vehicles": results[-50:]}

@app.post("/api/reid/match_crop")
def match_reid_crop(query: ReIDQueryRequest):
    if not shared_reid_engine:
        return {"status": "error", "message": "ReID engine not initialized"}
    try:
        # Decode base64 image
        img_bytes = base64.b64decode(query.image_base64.split(",")[-1])
        nparr = np.frombuffer(img_bytes, np.uint8)
        crop = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if crop is None or crop.size == 0:
            return {"status": "error", "message": "Invalid image crop"}
            
        emb = shared_reid_engine.extract_appearance_embedding(crop)
        matches = []
        
        for key, visits in shared_reid_engine.journey_db.items():
            for v in visits:
                sim = shared_reid_engine.calculate_similarity(emb, v['embedding'])
                if sim >= query.similarity_threshold:
                    matches.append({
                        "key": key,
                        "plate_text": v.get("plate_text"),
                        "camera_id": v.get("camera_id"),
                        "vehicle_id": v.get("vehicle_id"),
                        "timestamp": v.get("timestamp"),
                        "time_str": time.strftime("%H:%M:%S", time.localtime(v.get("timestamp", time.time()))),
                        "crop_thumb": v.get("crop_thumb", ""),
                        "similarity": round(float(sim), 4),
                        "similarity_percent": round(float(sim) * 100, 1)
                    })
                    
        matches.sort(key=lambda x: x["similarity"], reverse=True)
        return {
            "status": "success",
            "embedding_dim": len(emb),
            "embedding_sample": [round(float(x), 4) for x in emb[:10]],
            "matches": matches[:query.top_k]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.patch("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    conn = get_db()
    conn.execute("UPDATE alerts SET acknowledged=1 WHERE id=?", (alert_id,))
    conn.commit()
    row = conn.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
    conn.close()
    return row_to_dict(row)

@app.patch("/api/alerts/acknowledge-all")
def acknowledge_all_alerts():
    conn = get_db()
    conn.execute("UPDATE alerts SET acknowledged=1")
    conn.commit()
    conn.close()
    return {"status": "all acknowledged"}

# ─────────────────────────────────────────────────────────────────────────────
# Vehicles
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/vehicles")
def get_vehicles(limit: int = 100, camera: Optional[str] = None, flagged: Optional[bool] = None):
    conn = get_db()
    query = "SELECT * FROM vehicles WHERE 1=1"
    params = []
    if camera:
        query += " AND camera=?"
        params.append(camera)
    if flagged is not None:
        query += " AND flagged=?"
        params.append(int(flagged))
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return {"vehicles": rows_to_list(rows)}

# ─────────────────────────────────────────────────────────────────────────────
# ANPR Reads
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/anpr")
def get_anpr_reads(limit: int = 100, camera: Optional[str] = None, flagged: Optional[bool] = None):
    conn = get_db()
    query = "SELECT * FROM anpr_reads WHERE 1=1"
    params = []
    if camera:
        query += " AND camera=?"
        params.append(camera)
    if flagged is not None:
        query += " AND flagged=?"
        params.append(int(flagged))
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return {"reads": rows_to_list(rows)}

# ─────────────────────────────────────────────────────────────────────────────
# Traffic Stats
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/traffic/stats")
def get_traffic_stats():
    conn = get_db()
    # Time series
    time_series = conn.execute(
        "SELECT time_bucket, vehicle_count, anpr_count FROM traffic_stats WHERE camera='ALL' ORDER BY time_bucket"
    ).fetchall()
    # Vehicle type totals
    type_totals = conn.execute(
        "SELECT SUM(cars) as cars, SUM(motorcycles) as motorcycles, SUM(buses) as buses, SUM(trucks) as trucks, SUM(other) as other FROM traffic_stats WHERE camera='ALL'"
    ).fetchone()
    # Per camera (from cameras table)
    cameras = conn.execute("SELECT id, vehicles, traffic FROM cameras WHERE status != 'offline' ORDER BY vehicles DESC LIMIT 8").fetchall()
    # KPI
    kpi = conn.execute(
        "SELECT SUM(vehicle_count) as total_vehicles, SUM(anpr_count) as total_anpr FROM traffic_stats WHERE camera='ALL'"
    ).fetchone()
    cam_online = conn.execute("SELECT COUNT(*) FROM cameras WHERE status='online'").fetchone()[0]
    cam_total = conn.execute("SELECT COUNT(*) FROM cameras").fetchone()[0]
    active_alerts = conn.execute("SELECT COUNT(*) FROM alerts WHERE acknowledged=0").fetchone()[0]
    active_tracked = conn.execute("SELECT COUNT(*) FROM vehicles WHERE track_status='Tracked'").fetchone()[0]
    conn.close()

    return {
        "kpi": {
            "active_cameras": {"online": cam_online, "total": cam_total},
            "vehicles_detected": int(kpi["total_vehicles"] or 0),
            "vehicles_tracked": active_tracked,
            "anpr_reads": int(kpi["total_anpr"] or 0),
            "active_alerts": active_alerts,
            "congestion_score": 58,
        },
        "time_series": [{"time": r["time_bucket"], "vehicles": r["vehicle_count"], "anpr": r["anpr_count"]} for r in time_series],
        "vehicle_types": [
            {"name": "Cars", "value": int(type_totals["cars"] or 0), "color": "#3b82f6"},
            {"name": "Motorcycles", "value": int(type_totals["motorcycles"] or 0), "color": "#06b6d4"},
            {"name": "Buses", "value": int(type_totals["buses"] or 0), "color": "#22c55e"},
            {"name": "Trucks", "value": int(type_totals["trucks"] or 0), "color": "#f59e0b"},
            {"name": "Other", "value": int(type_totals["other"] or 0), "color": "#a855f7"},
        ],
        "camera_traffic": [{"cam": r["id"], "vehicles": r["vehicles"], "traffic": r["traffic"]} for r in cameras],
    }

# ─────────────────────────────────────────────────────────────────────────────
# Settings
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/settings")
def get_settings():
    conn = get_db()
    rows = conn.execute("SELECT key, value, updated_at FROM settings").fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

@app.put("/api/settings")
def update_settings(body: SettingsUpdate):
    conn = get_db()
    now = datetime.utcnow().isoformat()
    for key, value in body.settings.items():
        conn.execute("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
                     (key, str(value), now))
    conn.commit()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

# ─────────────────────────────────────────────────────────────────────────────
# Trajectories
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/trajectories")
def get_trajectories():
    conn = get_db()
    rows = conn.execute("SELECT * FROM trajectories ORDER BY created_at DESC").fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["points"] = json.loads(d["points"]) if d["points"] else []
        d["cameras"] = json.loads(d["cameras"]) if d["cameras"] else []
        result.append(d)
    return {"trajectories": result}

# ─────────────────────────────────────────────────────────────────────────────
# Reports
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/reports/summary")
def get_reports_summary():
    conn = get_db()
    total_vehicles = conn.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0]
    flagged_vehicles = conn.execute("SELECT COUNT(*) FROM vehicles WHERE flagged=1").fetchone()[0]
    total_anpr = conn.execute("SELECT COUNT(*) FROM anpr_reads").fetchone()[0]
    flagged_anpr = conn.execute("SELECT COUNT(*) FROM anpr_reads WHERE flagged=1").fetchone()[0]
    total_alerts = conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
    critical_alerts = conn.execute("SELECT COUNT(*) FROM alerts WHERE severity='critical'").fetchone()[0]
    watchlist_count = conn.execute("SELECT COUNT(*) FROM watchlist WHERE active=1").fetchone()[0]
    cam_online = conn.execute("SELECT COUNT(*) FROM cameras WHERE status='online'").fetchone()[0]
    conn.close()
    return {
        "summary": {
            "total_vehicles_today": total_vehicles,
            "flagged_vehicles": flagged_vehicles,
            "total_anpr_reads": total_anpr,
            "flagged_plates": flagged_anpr,
            "total_alerts": total_alerts,
            "critical_alerts": critical_alerts,
            "watchlist_active": watchlist_count,
            "cameras_online": cam_online,
        },
        "report_date": datetime.utcnow().strftime("%Y-%m-%d"),
    }

# ─────────────────────────────────────────────────────────────────────────────
# WebSocket Camera Feed
# ─────────────────────────────────────────────────────────────────────────────

def generate_synthetic_frame(camera_id: str, frame_num: int):
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Road
    cv2.rectangle(img, (100, 0), (540, 480), (50, 50, 50), -1)
    for y in range(0, 480, 40):
        cv2.line(img, (320, y), (320, y + 20), (255, 255, 255), 2)
    # Animated vehicles
    v1_y = (frame_num * 5) % 480
    v2_y = (480 - (frame_num * 7) % 480)
    cv2.rectangle(img, (180, v1_y), (250, v1_y + 90), (0, 165, 255), -1)
    cv2.putText(img, "KA01AB1234", (185, v1_y + 45), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
    cv2.rectangle(img, (380, v2_y), (450, v2_y + 100), (200, 50, 50), -1)
    cv2.putText(img, "MH14EB9999", (385, v2_y + 50), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
    # Camera label
    cv2.putText(img, f"{camera_id} — LIVE", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    cv2.putText(img, datetime.now().strftime("%H:%M:%S IST"), (10, 460), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
    return img

@app.websocket("/ws/camera/{camera_id}")
async def websocket_camera_feed(websocket: WebSocket, camera_id: str):
    await handle_camera_stream(websocket, camera_id)

AICITY_ZIP_PATH = "/Users/pashanth/Downloads/AICity22_Track1_MTMC_Tracking.zip"

def get_aicity_dataset_dir(root_dir: str) -> str:
    return os.path.join(root_dir, "data", "vehicle_reid_dataset")

CAMERA_FOOTAGE_MAP = {
    # Sequence S01 (Intersection - Cameras 1-5)
    "CAM-001": os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c001", "vdo.avi"),
    "CAM_01":  os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c001", "vdo.avi"),
    "c001":    os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c001", "vdo.avi"),

    "CAM-002": os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c002", "vdo.avi"),
    "CAM_02":  os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c002", "vdo.avi"),
    "c002":    os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c002", "vdo.avi"),

    "CAM-003": os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c003", "vdo.avi"),
    "CAM_03":  os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c003", "vdo.avi"),
    "c003":    os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c003", "vdo.avi"),

    "CAM-004": os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c004", "vdo.avi"),
    "CAM_04":  os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c004", "vdo.avi"),
    "c004":    os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c004", "vdo.avi"),

    "CAM-005": os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c005", "vdo.avi"),
    "CAM_05":  os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c005", "vdo.avi"),
    "c005":    os.path.join("data", "vehicle_reid_dataset", "train", "S01", "c005", "vdo.avi"),

    # Sequence S02 (Cameras 6-9)
    "CAM-006": os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c006", "vdo.avi"),
    "CAM_06":  os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c006", "vdo.avi"),
    "c006":    os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c006", "vdo.avi"),

    "CAM-007": os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c007", "vdo.avi"),
    "CAM_07":  os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c007", "vdo.avi"),
    "c007":    os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c007", "vdo.avi"),

    "CAM-008": os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c008", "vdo.avi"),
    "CAM_08":  os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c008", "vdo.avi"),
    "c008":    os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c008", "vdo.avi"),

    "CAM-009": os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c009", "vdo.avi"),
    "CAM_09":  os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c009", "vdo.avi"),
    "c009":    os.path.join("data", "vehicle_reid_dataset", "validation", "S02", "c009", "vdo.avi"),

    # Sequence S03 (Cameras 10-12)
    "CAM-010": os.path.join("data", "vehicle_reid_dataset", "train", "S03", "c010", "vdo.avi"),
    "CAM_10":  os.path.join("data", "vehicle_reid_dataset", "train", "S03", "c010", "vdo.avi"),
    "c010":    os.path.join("data", "vehicle_reid_dataset", "train", "S03", "c010", "vdo.avi"),

    "CAM-011": os.path.join("data", "vehicle_reid_dataset", "train", "S03", "c011", "vdo.avi"),
    "CAM_11":  os.path.join("data", "vehicle_reid_dataset", "train", "S03", "c011", "vdo.avi"),
    "c011":    os.path.join("data", "vehicle_reid_dataset", "train", "S03", "c011", "vdo.avi"),

    "CAM-012": os.path.join("data", "vehicle_reid_dataset", "train", "S03", "c012", "vdo.avi"),
    "CAM_12":  os.path.join("data", "vehicle_reid_dataset", "train", "S03", "c012", "vdo.avi"),
    "c012":    os.path.join("data", "vehicle_reid_dataset", "train", "S03", "c012", "vdo.avi"),
}

def resolve_camera_footage(camera_id: str, root_dir: str) -> str:
    """Finds the AICity MTMC dataset video path for a given camera ID, checking local files and the source zip."""
    # 1. Direct map lookup
    if camera_id in CAMERA_FOOTAGE_MAP:
        rel_path = CAMERA_FOOTAGE_MAP[camera_id]
        full_path = os.path.join(root_dir, rel_path) if not os.path.isabs(rel_path) else rel_path
        if os.path.exists(full_path):
            return full_path

    # 2. Extract numeric camera index (e.g. CAM-003 -> 3 -> c003)
    cam_digits = "".join(filter(str.isdigit, camera_id))
    dataset_dir = get_aicity_dataset_dir(root_dir)
    if cam_digits:
        c_name = f"c{int(cam_digits):03d}"
        for sub in ["train/S01", "validation/S02", "train/S03", "train/S04", "validation/S05", "test/S06"]:
            candidate = os.path.join(dataset_dir, sub, c_name, "vdo.avi")
            if os.path.exists(candidate):
                return candidate

    # 3. If missing from extracted dataset but zip exists, extract target camera on-demand
    if os.path.exists(AICITY_ZIP_PATH) and cam_digits:
        import zipfile
        c_name = f"c{int(cam_digits):03d}"
        try:
            with zipfile.ZipFile(AICITY_ZIP_PATH, 'r') as z:
                target_entries = [f for f in z.namelist() if f.endswith(f"{c_name}/vdo.avi")]
                if target_entries:
                    z.extract(target_entries[0], dataset_dir)
                    extracted_path = os.path.join(dataset_dir, target_entries[0])
                    if os.path.exists(extracted_path):
                        return extracted_path
        except Exception as e:
            print(f"[Footage] Error extracting from zip: {e}")

    # 4. Fallback to default S01/c001
    default_dataset_vdo = os.path.join(dataset_dir, "train", "S01", "c001", "vdo.avi")
    if os.path.exists(default_dataset_vdo):
        return default_dataset_vdo

    return os.path.join(root_dir, "sample_traffic.mp4")

class CameraStreamWorker:
    """
    Decodes video frames once per camera, runs lightweight detection every N frames,
    downsamples to 640x360 at JPEG Q=65, and broadcasts to all connected WebSockets.
    Multiple connected devices share the same decoded frame without CPU duplication.
    """
    def __init__(self, camera_id: str, video_path: str, pipeline=None):
        self.camera_id = camera_id
        self.video_path = video_path
        self.pipeline = pipeline
        self.subscribers: set[WebSocket] = set()
        self.task: Optional[asyncio.Task] = None
        self.latest_json: Optional[str] = None
        self.running = False
        self.last_metadata = {"alerts": [], "detections": [], "anpr": []}
        self.last_db_alert_time: dict[str, float] = {}
        self.last_db_anpr_time: dict[str, float] = {}

    def add_subscriber(self, ws: WebSocket):
        self.subscribers.add(ws)
        if not self.running or self.task is None or self.task.done():
            self.running = True
            self.task = asyncio.create_task(self._run_loop())

    def remove_subscriber(self, ws: WebSocket):
        self.subscribers.discard(ws)

    def _sync_read_and_process(self, cap, frame_count: int):
        ret, frame = False, None
        if cap and cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()

        if not ret or frame is None:
            frame = generate_synthetic_frame(self.camera_id, frame_count)

        # Immediate downsampling to 640px width (fast, drops RAM and CPU decode strain by 5x)
        h, w = frame.shape[:2]
        if w > 640:
            target_w = 640
            target_h = int(target_w * h / w)
            frame = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_LINEAR)

        metadata = self.last_metadata
        if self.pipeline:
            # Run detection on every 3rd frame so stream stays at 11+ FPS and CPU stays low
            if frame_count % 3 == 0 or not self.last_metadata.get('detections'):
                try:
                    frame, metadata = self.pipeline.process_frame(frame)
                    self.last_metadata = metadata
                except Exception:
                    pass

        # Compress to JPEG with quality 65 (compact ~20-25KB payload for instant mobile/network loading)
        _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
        jpg_b64 = base64.b64encode(buffer).decode('utf-8')

        payload = {
            'camera_id': self.camera_id,
            'frame': f"data:image/jpeg;base64,{jpg_b64}",
            'metadata': metadata,
            'timestamp': datetime.now().strftime("%H:%M:%S")
        }
        return json.dumps(payload), metadata

    def _throttle_db_writes(self, metadata: dict):
        now = time.time()
        now_iso = datetime.utcnow().isoformat()
        time_str = datetime.now().strftime("%H:%M:%S")

        new_alerts = []
        for alert in metadata.get('alerts', []):
            plate = alert.get('plate_text', '')
            key = f"{alert.get('type')}:{plate}"
            if now - self.last_db_alert_time.get(key, 0) > 10.0:
                self.last_db_alert_time[key] = now
                aid = f"ALT-{str(uuid.uuid4())[:8].upper()}"
                new_alerts.append((
                    aid, alert.get('type', 'DETECTION'), alert.get('severity', 'info'),
                    plate, self.camera_id, plate, str(alert), time_str, now_iso
                ))

        new_anpr = []
        for det in metadata.get('detections', []):
            p_text = det.get('plate_text')
            if p_text and p_text != 'UNKNOWN':
                if now - self.last_db_anpr_time.get(p_text, 0) > 10.0:
                    self.last_db_anpr_time[p_text] = now
                    rid = f"ANPR-{str(uuid.uuid4())[:8].upper()}"
                    new_anpr.append((
                        rid, p_text, self.camera_id, 94.5, det.get('type', 'car'), now_iso
                    ))

        if new_alerts or new_anpr:
            try:
                conn = get_db()
                if new_alerts:
                    conn.executemany("""INSERT OR IGNORE INTO alerts (id,type,severity,subject,camera,plate,message,acknowledged,timestamp,created_at)
                                        VALUES (?,?,?,?,?,?,?,0,?,?)""", new_alerts)
                if new_anpr:
                    conn.executemany("""INSERT OR IGNORE INTO anpr_reads (id,plate_number,camera_id,confidence,vehicle_type,flagged,status,created_at)
                                        VALUES (?,?,?,?,?,0,'Verified',?)""", new_anpr)
                conn.commit()
                conn.close()
            except Exception:
                pass

    async def _run_loop(self):
        cap = None
        if os.path.exists(self.video_path):
            cap = cv2.VideoCapture(self.video_path)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 2000)
            offset = (abs(hash(self.camera_id)) * 73) % max(1, total_frames - 200)
            cap.set(cv2.CAP_PROP_POS_FRAMES, offset)
        elif self.camera_id == "CAM_01":
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                cap = None

        frame_count = 0
        idle_cycles = 0
        try:
            while self.running:
                if not self.subscribers:
                    idle_cycles += 1
                    # Stop after 15 seconds of no connected viewers to conserve CPU
                    if idle_cycles > 150:
                        break
                    await asyncio.sleep(0.1)
                    continue

                idle_cycles = 0
                frame_count += 1

                try:
                    # Offload CPU operations to thread so async event loop never blocks
                    json_str, metadata = await asyncio.to_thread(
                        self._sync_read_and_process, cap, frame_count
                    )
                    self.latest_json = json_str
                except Exception:
                    await asyncio.sleep(0.08)
                    continue

                # Fan-out to all connected subscribers in parallel
                stale = []
                for ws in list(self.subscribers):
                    try:
                        await ws.send_text(json_str)
                    except Exception:
                        stale.append(ws)
                for ws in stale:
                    self.subscribers.discard(ws)

                # Debounced DB persistence in background
                if metadata.get('alerts') or metadata.get('detections'):
                    asyncio.create_task(asyncio.to_thread(self._throttle_db_writes, metadata))

                await asyncio.sleep(0.09) # ~11 FPS: fluid surveillance, lightweight bandwidth
        finally:
            self.running = False
            if cap:
                cap.release()


class CameraStreamHub:
    def __init__(self):
        self.workers: dict[str, CameraStreamWorker] = {}
        self.lock = asyncio.Lock()

    async def get_worker(self, camera_id: str, root_dir: str) -> CameraStreamWorker:
        async with self.lock:
            if camera_id not in self.workers or not self.workers[camera_id].running:
                video_path = resolve_camera_footage(camera_id, root_dir)
                pipeline = pipelines.get(camera_id)
                if not pipeline and ML_AVAILABLE:
                    try:
                        pipeline = SurveillancePipeline(camera_id=camera_id, reid_engine=shared_reid_engine)
                    except Exception:
                        pipeline = None
                self.workers[camera_id] = CameraStreamWorker(camera_id, video_path, pipeline)
            return self.workers[camera_id]


camera_stream_hub = CameraStreamHub()


async def handle_camera_stream(websocket: WebSocket, camera_id: str):
    await websocket.accept()
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    worker = await camera_stream_hub.get_worker(camera_id, root_dir)

    # Deliver latest cached frame in 0ms for instant loading perception
    if worker.latest_json:
        try:
            await websocket.send_text(worker.latest_json)
        except Exception:
            return

    worker.add_subscriber(websocket)
    try:
        while True:
            # Await client keep-alive/disconnect
            await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        worker.remove_subscriber(websocket)


# ─────────────────────────────────────────────────────────────────────────────
# Legacy HTML dashboard (kept for reference)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
def index_dashboard():
    return """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>UrbanTrax AI API</title>
<style>body{font-family:monospace;background:#0a0e1a;color:#e2eaf3;padding:2rem;}
a{color:#60a5fa;}h1{color:#60a5fa;}</style></head>
<body><h1>UrbanTrax AI — Backend API v2.0</h1>
<p>React frontend handles the UI. API endpoints:</p>
<ul>
<li><a href="/api/health">/api/health</a></li>
<li><a href="/api/cameras">/api/cameras</a></li>
<li><a href="/api/watchlist">/api/watchlist</a></li>
<li><a href="/api/alerts">/api/alerts</a></li>
<li><a href="/api/vehicles">/api/vehicles</a></li>
<li><a href="/api/anpr">/api/anpr</a></li>
<li><a href="/api/traffic/stats">/api/traffic/stats</a></li>
<li><a href="/api/system/health">/api/system/health</a></li>
<li><a href="/api/settings">/api/settings</a></li>
<li><a href="/api/trajectories">/api/trajectories</a></li>
<li><a href="/api/reports/summary">/api/reports/summary</a></li>
<li><a href="/docs">/docs — Swagger UI</a></li>
</ul></body></html>"""


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
