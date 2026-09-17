import sqlite3
import os
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "urbantrax.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Watchlist table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS watchlist (
            plate_number TEXT PRIMARY KEY,
            added_at REAL
        )
    ''')
    
    # Alerts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            severity TEXT,
            plate_text TEXT,
            camera_id TEXT,
            timestamp REAL
        )
    ''')

    # ANPR Reads table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS anpr_reads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plate_text TEXT,
            camera_id TEXT,
            confidence REAL,
            timestamp REAL
        )
    ''')
    
    conn.commit()
    
    # Migrate initial watchlist if empty
    cursor.execute("SELECT COUNT(*) FROM watchlist")
    if cursor.fetchone()[0] == 0:
        initial_plates = ["KA01AB1234", "MH12DE5678", "DL03C9999"]
        for p in initial_plates:
            cursor.execute("INSERT INTO watchlist (plate_number, added_at) VALUES (?, ?)", (p, time.time()))
        conn.commit()
        
    conn.close()

def get_watchlist_plates():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT plate_number FROM watchlist")
    plates = [row['plate_number'] for row in cursor.fetchall()]
    conn.close()
    return plates

def add_to_watchlist(plate: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO watchlist (plate_number, added_at) VALUES (?, ?)", (plate, time.time()))
        conn.commit()
    except sqlite3.IntegrityError:
        pass # Already exists
    finally:
        conn.close()

def remove_from_watchlist(plate: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM watchlist WHERE plate_number = ?", (plate,))
    conn.commit()
    conn.close()

def insert_alert(alert_type: str, severity: str, plate: str, camera_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO alerts (type, severity, plate_text, camera_id, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (alert_type, severity, plate, camera_id, time.time()))
    conn.commit()
    alert_id = cursor.lastrowid
    conn.close()
    return alert_id

def get_recent_alerts(limit=20):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?", (limit,))
    alerts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return alerts

def insert_anpr_read(plate: str, camera_id: str, confidence: float):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO anpr_reads (plate_text, camera_id, confidence, timestamp)
        VALUES (?, ?, ?, ?)
    ''', (plate, camera_id, confidence, time.time()))
    conn.commit()
    read_id = cursor.lastrowid
    conn.close()
    return read_id

def get_recent_anpr(limit=20):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM anpr_reads ORDER BY timestamp DESC LIMIT ?", (limit,))
    reads = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return reads

def get_overview_stats():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Total vehicles tracked is tricky without a dedicated table, let's proxy with ANPR reads
    cursor.execute("SELECT COUNT(*) FROM anpr_reads")
    total_anpr = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM alerts")
    total_alerts = cursor.fetchone()[0]
    
    # Count alerts by severity
    cursor.execute("SELECT severity, COUNT(*) FROM alerts GROUP BY severity")
    alert_counts = {row['severity']: row['COUNT(*)'] for row in cursor.fetchall()}
    
    conn.close()
    
    return {
        "vehiclesDetected": {"value": 12482 + total_anpr, "trend": 3.4}, # baseline + new reads
        "anprReads": {"value": 3842 + total_anpr, "trend": 5.1},
        "activeAlerts": {
            "value": total_alerts, 
            "critical": alert_counts.get("critical", 0), 
            "warning": alert_counts.get("warning", 0) + alert_counts.get("high", 0) + alert_counts.get("medium", 0), 
            "info": alert_counts.get("info", 0) + alert_counts.get("low", 0)
        }
    }
