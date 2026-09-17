/**
 * api.ts — Centralized API service for UrbanTrax AI
 * Includes seamless fallback datasets for Vercel static deployments.
 */

const API_BASE = (import.meta.env.VITE_API_URL as string) || '';

// ─────────────────────────── Mock Fallback Data ───────────────────────────

const MOCK_CAMERAS: Camera[] = [
  { id: 'CAM_01', name: 'MG Road Junction', location: 'MG Road / Brigade Rd', zone: 'Central', lat: 12.9716, lng: 77.5946, map_x: 35, map_y: 28, status: 'online', fps: 30, traffic: 'moderate', vehicles: 42, enabled: 1 },
  { id: 'CAM_02', name: 'Silk Board Flyover', location: 'Hosur Road / Outer Ring Rd', zone: 'South', lat: 12.9172, lng: 77.6228, map_x: 60, map_y: 52, status: 'warning', fps: 28, traffic: 'high', vehicles: 88, enabled: 1 },
  { id: 'CAM_03', name: 'Indiranagar 100ft Rd', location: '100ft Road Corridor', zone: 'East', lat: 12.9784, lng: 77.6408, map_x: 48, map_y: 32, status: 'online', fps: 30, traffic: 'moderate', vehicles: 31, enabled: 1 },
  { id: 'CAM_04', name: 'Hebbal Flyover', location: 'Bellary Road / Airport Rd', zone: 'North', lat: 13.0358, lng: 77.5970, map_x: 28, map_y: 18, status: 'online', fps: 29, traffic: 'low', vehicles: 65, enabled: 1 },
  { id: 'CAM_05', name: 'Electronic City Toll', location: 'Hosur Elevated Expressway', zone: 'South', lat: 12.8452, lng: 77.6602, map_x: 75, map_y: 70, status: 'online', fps: 30, traffic: 'moderate', vehicles: 54, enabled: 1 },
  { id: 'CAM_06', name: 'Whitefield Main Rd', location: 'ITPB Main Gate', zone: 'East', lat: 12.9698, lng: 77.7499, map_x: 82, map_y: 38, status: 'online', fps: 25, traffic: 'low', vehicles: 29, enabled: 1 },
];

const MOCK_WATCHLIST: WatchlistEntry[] = [
  { id: 'W001', plate_number: 'KA01AB1234', vehicle_id: 'UTX-VH-00124', description: 'White Fortuner SUV', reason: 'Stolen Vehicle Alert', priority: 'critical', notes: 'Bolo issued by MG Road Station', active: 1, alert_count: 3, last_seen: '10 mins ago', last_camera: 'CAM_01', created_at: new Date().toISOString() },
  { id: 'W002', plate_number: 'TN09CD5678', vehicle_id: 'UTX-VH-00125', description: 'Black Pulsar 220', reason: 'Speed Violation Repeat', priority: 'high', notes: 'Logged at 110km/h in 60 zone', active: 1, alert_count: 5, last_seen: '25 mins ago', last_camera: 'CAM_02', created_at: new Date().toISOString() },
  { id: 'W003', plate_number: 'MH12EF9012', vehicle_id: 'UTX-VH-00131', description: 'Red Swift Hatchback', reason: 'Tax Evasion / Unregistered', priority: 'medium', notes: 'Flagged by RTO DB', active: 1, alert_count: 1, last_seen: '1 hour ago', last_camera: 'CAM_04', created_at: new Date().toISOString() },
];

const MOCK_ALERTS: Alert[] = [
  { id: 'ALT-101', type: 'WATCHLIST_MATCH', severity: 'critical', subject: 'Stolen Vehicle KA01AB1234 Detected', camera: 'CAM_01', location: 'MG Road Junction', plate: 'KA01AB1234', message: 'Vehicle KA01AB1234 matched active watchlist entry W001 with 98% confidence.', acknowledged: 0, timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'ALT-102', type: 'SPEEDING', severity: 'warning', subject: 'Vehicle Exceeded Speed Limit (94 km/h)', camera: 'CAM_02', location: 'Silk Board Flyover', plate: 'TN09CD5678', message: 'Vehicle detected traveling at 94 km/h in a 50 km/h zone.', acknowledged: 0, timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'ALT-103', type: 'CONGESTION', severity: 'warning', subject: 'Heavy Congestion Detected (88 vpm)', camera: 'CAM_02', location: 'Silk Board Flyover', message: 'Traffic density exceeded warning threshold of 75 vehicles per minute.', acknowledged: 1, timestamp: new Date().toISOString(), created_at: new Date().toISOString() },
];

const MOCK_TRAFFIC_STATS: TrafficStats = {
  kpi: {
    active_cameras: { online: 6, total: 6 },
    vehicles_detected: 14820,
    vehicles_tracked: 1240,
    anpr_reads: 8940,
    active_alerts: 3,
    congestion_score: 58,
  },
  time_series: [
    { time: '09:00', vehicles: 310, anpr: 210 },
    { time: '09:30', vehicles: 412, anpr: 280 },
    { time: '10:00', vehicles: 523, anpr: 355 },
    { time: '10:30', vehicles: 548, anpr: 371 },
    { time: '11:00', vehicles: 490, anpr: 330 },
  ],
  vehicle_types: [
    { name: 'Cars / Sedans', value: 6965, color: '#3b82f6' },
    { name: 'Two Wheelers', value: 3705, color: '#06b6d4' },
    { name: 'SUVs', value: 2223, color: '#22c55e' },
    { name: 'Buses / Trucks', value: 1927, color: '#f59e0b' },
  ],
  camera_traffic: [
    { cam: 'CAM_01', vehicles: 42, traffic: 'moderate' },
    { cam: 'CAM_02', vehicles: 88, traffic: 'high' },
    { cam: 'CAM_03', vehicles: 31, traffic: 'moderate' },
    { cam: 'CAM_04', vehicles: 65, traffic: 'moderate' },
    { cam: 'CAM_05', vehicles: 54, traffic: 'moderate' },
    { cam: 'CAM_06', vehicles: 29, traffic: 'low' },
  ],
};

const MOCK_SYSTEM_HEALTH: SystemHealth = {
  services: [
    { name: 'FastAPI REST Server', status: 'healthy', latency_ms: 12, uptime_pct: 99.9 },
    { name: 'SQLite Database', status: 'healthy', latency_ms: 4, uptime_pct: 100 },
    { name: 'YOLO Detection Engine', status: 'healthy', latency_ms: 22, uptime_pct: 99.8 },
    { name: 'EasyOCR ANPR Pipeline', status: 'healthy', latency_ms: 45, uptime_pct: 99.5 },
  ],
  cameras: { total: 6, online: 6, warning: 1, offline: 0 },
  stats: { total_vehicles: 14820, total_anpr_reads: 8940, active_alerts: 3 },
  resources: { cpu_pct: 28, memory_pct: 42, gpu_pct: 35, disk_gb_used: 18, disk_gb_total: 100 },
};

async function apiFetch<T>(path: string, options?: RequestInit, fallback?: T): Promise<T> {
  const envUrl = (import.meta.env.VITE_API_URL as string) || '';
  const candidates: string[] = [];

  if (envUrl) {
    candidates.push(`${envUrl}${path}`);
  }

  // 1. Direct port 8000 on current hostname (fastest, avoids sandboxed proxy bottlenecks)
  if (typeof window !== 'undefined' && window.location.port !== '8000') {
    const hostname = window.location.hostname || 'localhost';
    candidates.push(`http://${hostname}:8000${path}`);
  }

  // 2. Relative path (proxied by web server or reverse proxy)
  candidates.push(path);

  // 3. Localhost explicit fallback
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    candidates.push(`http://127.0.0.1:8000${path}`);
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options,
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {
      // Try next candidate
    }
  }

  if (fallback !== undefined) return fallback;
  throw new Error(`Failed to fetch ${path}`);
}

// ─────────────────────────── Types ────────────────────────────────────────

export interface Camera {
  id: string;
  name: string;
  location: string;
  zone: string;
  lat: number;
  lng: number;
  map_x: number;
  map_y: number;
  status: 'online' | 'offline' | 'warning';
  fps: number;
  traffic: 'high' | 'moderate' | 'low' | 'clear';
  vehicles: number;
  enabled: number;
  stream_url?: string;
  ai_model?: string;
  created_at?: string;
}

export interface WatchlistEntry {
  id: string;
  plate_number: string;
  vehicle_id: string;
  description: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  notes?: string;
  active: number;
  alert_count: number;
  last_seen?: string;
  last_camera?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  subject: string;
  camera: string;
  location?: string;
  plate?: string;
  message?: string;
  acknowledged: number;
  timestamp: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  vehicle_id: string;
  type: string;
  plate: string;
  confidence: number;
  track_status: 'Tracked' | 'Lost' | 'Exited';
  camera: string;
  flagged: number;
  speed?: number;
  direction?: string;
  timestamp: string;
  created_at: string;
}

export interface AnprRead {
  id: string;
  plate: string;
  confidence: number;
  camera: string;
  flagged: number;
  vehicle_type?: string;
  vehicle_id?: string;
  timestamp: string;
  created_at: string;
}

export interface SystemHealth {
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'offline';
    latency_ms: number;
    uptime_pct: number;
  }>;
  cameras: { total: number; online: number; warning: number; offline: number };
  stats: { total_vehicles: number; total_anpr_reads: number; active_alerts: number };
  resources: { cpu_pct: number; memory_pct: number; gpu_pct: number; disk_gb_used: number; disk_gb_total: number };
}

export interface TrafficStats {
  kpi: {
    active_cameras: { online: number; total: number };
    vehicles_detected: number;
    vehicles_tracked: number;
    anpr_reads: number;
    active_alerts: number;
    congestion_score: number;
  };
  time_series: Array<{ time: string; vehicles: number; anpr: number }>;
  vehicle_types: Array<{ name: string; value: number; color: string }>;
  camera_traffic: Array<{ cam: string; vehicles: number; traffic: string }>;
}

export interface Trajectory {
  id: string;
  vehicle_id: string;
  plate: string;
  vehicle_type: string;
  points: number[][];
  cameras: string[];
  start_time: string;
  end_time: string;
  flagged: number;
  created_at: string;
}

export interface ReportSummary {
  summary: {
    total_vehicles_today: number;
    flagged_vehicles: number;
    total_anpr_reads: number;
    flagged_plates: number;
    total_alerts: number;
    critical_alerts: number;
    watchlist_active: number;
    cameras_online: number;
  };
  report_date: string;
}

// ─────────────────────────── Health ───────────────────────────────────────

export const getHealth = () =>
  apiFetch<{ status: string; active_cameras: number; unacknowledged_alerts: number; ml_available: boolean }>(
    '/api/health',
    undefined,
    { status: 'online', active_cameras: 6, unacknowledged_alerts: 2, ml_available: true }
  );

export const getSystemHealth = () =>
  apiFetch<SystemHealth>('/api/system/health', undefined, MOCK_SYSTEM_HEALTH);

// ─────────────────────────── Cameras ──────────────────────────────────────

export const getCameras = () =>
  apiFetch<Camera[]>('/api/cameras', undefined, MOCK_CAMERAS);

export const getCamera = (id: string) =>
  apiFetch<Camera>(`/api/cameras/${id}`, undefined, MOCK_CAMERAS.find(c => c.id === id) || MOCK_CAMERAS[0]);

export const updateCamera = (id: string, update: { enabled?: boolean; fps?: number; name?: string }) =>
  apiFetch<Camera>(`/api/cameras/${id}`, { method: 'PATCH', body: JSON.stringify(update) }, {
    ...MOCK_CAMERAS[0],
    ...update,
    enabled: update.enabled !== undefined ? (update.enabled ? 1 : 0) : MOCK_CAMERAS[0].enabled,
  });

// ─────────────────────────── Watchlist ────────────────────────────────────

export const getWatchlist = () =>
  apiFetch<{ watchlist: WatchlistEntry[] }>('/api/watchlist', undefined, { watchlist: MOCK_WATCHLIST });

export const addToWatchlist = (data: {
  plate_number: string; vehicle_id?: string; description?: string; reason?: string; priority?: string; notes?: string;
}) => {
  const newEntry: WatchlistEntry = {
    id: `W${Math.floor(Math.random() * 900) + 100}`,
    plate_number: data.plate_number,
    vehicle_id: data.vehicle_id || 'UTX-VH-AUTO',
    description: data.description || 'Watchlist Vehicle',
    reason: data.reason || 'Manual Entry',
    priority: (data.priority as any) || 'medium',
    notes: data.notes || '',
    active: 1,
    alert_count: 0,
    created_at: new Date().toISOString(),
  };
  return apiFetch<WatchlistEntry>('/api/watchlist', { method: 'POST', body: JSON.stringify(data) }, newEntry);
};

export const updateWatchlistEntry = (id: string, update: { active?: boolean; priority?: string; reason?: string; description?: string }) =>
  apiFetch<WatchlistEntry>(`/api/watchlist/${id}`, { method: 'PATCH', body: JSON.stringify(update) }, { ...MOCK_WATCHLIST[0], id });

export const removeFromWatchlist = (plate: string) =>
  apiFetch<{ status: string; watchlist: WatchlistEntry[] }>(
    `/api/watchlist/${encodeURIComponent(plate)}`,
    { method: 'DELETE' },
    { status: 'deleted', watchlist: MOCK_WATCHLIST.filter(w => w.plate_number !== plate) }
  );

// ─────────────────────────── Alerts ───────────────────────────────────────

export const getAlerts = (params?: { limit?: number; severity?: string; acknowledged?: boolean }) => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.severity) qs.set('severity', params.severity);
  if (params?.acknowledged !== undefined) qs.set('acknowledged', String(params.acknowledged));
  return apiFetch<{ alerts: Alert[] }>(`/api/alerts${qs.toString() ? `?${qs}` : ''}`, undefined, { alerts: MOCK_ALERTS });
};

export const acknowledgeAlert = (id: string) =>
  apiFetch<Alert>(`/api/alerts/${id}/acknowledge`, { method: 'PATCH' }, { ...MOCK_ALERTS[0], id, acknowledged: 1 });

export const acknowledgeAllAlerts = () =>
  apiFetch<{ status: string }>('/api/alerts/acknowledge-all', { method: 'PATCH' }, { status: 'acknowledged' });

const MOCK_VEHICLES_LIST: Vehicle[] = [
  { id: 'V001', vehicle_id: 'UTX-VH-00124', type: 'SUV', plate: 'KA01AB1234', confidence: 94.6, track_status: 'Tracked', camera: 'CAM_01', flagged: 1, speed: 64, direction: 'Northbound', timestamp: '10:47:22', created_at: new Date().toISOString() },
  { id: 'V002', vehicle_id: 'UTX-VH-00125', type: 'Sedan', plate: 'MH12CD5678', confidence: 88.2, track_status: 'Tracked', camera: 'CAM_02', flagged: 1, speed: 94, direction: 'Southbound', timestamp: '10:51:09', created_at: new Date().toISOString() },
  { id: 'V003', vehicle_id: 'UTX-VH-00126', type: 'Motorcycle', plate: 'DL3CXY9010', confidence: 71.4, track_status: 'Exited', camera: 'CAM_03', flagged: 0, speed: 45, direction: 'Eastbound', timestamp: '10:33:11', created_at: new Date().toISOString() },
  { id: 'V004', vehicle_id: 'UTX-VH-00127', type: 'Bus', plate: 'TN09EF3456', confidence: 97.1, track_status: 'Tracked', camera: 'CAM_04', flagged: 0, speed: 38, direction: 'Westbound', timestamp: '10:42:55', created_at: new Date().toISOString() },
  { id: 'V005', vehicle_id: 'UTX-VH-00128', type: 'Truck', plate: 'KA03GH7890', confidence: 82.9, track_status: 'Lost', camera: 'CAM_01', flagged: 1, speed: 52, direction: 'Northbound', timestamp: '10:28:44', created_at: new Date().toISOString() },
  { id: 'V006', vehicle_id: 'UTX-VH-00129', type: 'Auto', plate: 'AP39IJ1122', confidence: 66.3, track_status: 'Tracked', camera: 'CAM_05', flagged: 0, speed: 30, direction: 'Southbound', timestamp: '10:55:30', created_at: new Date().toISOString() },
  { id: 'V007', vehicle_id: 'UTX-VH-00130', type: 'Car', plate: 'GJ05KL3344', confidence: 91.0, track_status: 'Tracked', camera: 'CAM_03', flagged: 0, speed: 55, direction: 'Eastbound', timestamp: '10:44:19', created_at: new Date().toISOString() },
  { id: 'V008', vehicle_id: 'UTX-VH-00131', type: 'SUV', plate: 'RJ14MN5566', confidence: 79.5, track_status: 'Tracked', camera: 'CAM_06', flagged: 1, speed: 60, direction: 'Northbound', timestamp: '10:59:01', created_at: new Date().toISOString() },
  { id: 'V009', vehicle_id: 'UTX-VH-00132', type: 'Sedan', plate: 'WB01PQ7788', confidence: 85.7, track_status: 'Exited', camera: 'CAM_05', flagged: 0, speed: 48, direction: 'Southbound', timestamp: '10:15:38', created_at: new Date().toISOString() },
  { id: 'V010', vehicle_id: 'UTX-VH-00133', type: 'Motorcycle', plate: 'TS07RS9900', confidence: 58.1, track_status: 'Tracked', camera: 'CAM_02', flagged: 0, speed: 72, direction: 'Southbound', timestamp: '10:58:22', created_at: new Date().toISOString() },
  { id: 'V011', vehicle_id: 'UTX-VH-00134', type: 'Car', plate: 'KL08TU1234', confidence: 93.3, track_status: 'Tracked', camera: 'CAM_04', flagged: 0, speed: 50, direction: 'Westbound', timestamp: '10:49:55', created_at: new Date().toISOString() },
  { id: 'V012', vehicle_id: 'UTX-VH-00135', type: 'Truck', plate: 'HR26VW5678', confidence: 96.8, track_status: 'Lost', camera: 'CAM_01', flagged: 1, speed: 42, direction: 'Northbound', timestamp: '10:07:44', created_at: new Date().toISOString() },
];

export const getVehicles = (params?: { limit?: number; camera?: string; flagged?: boolean }) => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.camera) qs.set('camera', params.camera);
  if (params?.flagged !== undefined) qs.set('flagged', String(params.flagged));
  return apiFetch<{ vehicles: Vehicle[] }>(`/api/vehicles${qs.toString() ? `?${qs}` : ''}`, undefined, {
    vehicles: MOCK_VEHICLES_LIST,
  });
};

// ─────────────────────────── ANPR ─────────────────────────────────────────

export const getAnprReads = (params?: { limit?: number; camera?: string; flagged?: boolean }) => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.camera) qs.set('camera', params.camera);
  if (params?.flagged !== undefined) qs.set('flagged', String(params.flagged));
  return apiFetch<{ reads: AnprRead[] }>(`/api/anpr${qs.toString() ? `?${qs}` : ''}`, undefined, {
    reads: [
      { id: 'A001', plate: 'KA01AB1234', confidence: 98, camera: 'CAM_01', flagged: 1, vehicle_type: 'SUV', vehicle_id: 'UTX-VH-00124', timestamp: '10:32:15', created_at: new Date().toISOString() },
      { id: 'A002', plate: 'TN09CD5678', confidence: 95, camera: 'CAM_02', flagged: 1, vehicle_type: 'Motorcycle', vehicle_id: 'UTX-VH-00125', timestamp: '10:32:45', created_at: new Date().toISOString() },
    ],
  });
};

// ─────────────────────────── Traffic ──────────────────────────────────────

export const getTrafficStats = () =>
  apiFetch<TrafficStats>('/api/traffic/stats', undefined, MOCK_TRAFFIC_STATS);

// ─────────────────────────── Settings ─────────────────────────────────────

export const getSettings = () =>
  apiFetch<Record<string, string>>('/api/settings', undefined, {
    detection_confidence: '0.25',
    anpr_confidence: '0.80',
    alert_threshold_congestion: '40',
    site_name: 'UrbanTrax AI — Bengaluru',
  });

export const updateSettings = (settings: Record<string, string | number | boolean>) =>
  apiFetch<Record<string, string>>('/api/settings', { method: 'PUT', body: JSON.stringify({ settings }) }, { status: 'updated' } as any);

// ─────────────────────────── Trajectories ─────────────────────────────────

export const getTrajectories = () =>
  apiFetch<{ trajectories: Trajectory[] }>('/api/trajectories', undefined, {
    trajectories: [
      { id: 'TRJ-001', vehicle_id: 'UTX-VH-00124', plate: 'KA01AB1234', vehicle_type: 'SUV', points: [[38, 28], [52, 22], [28, 18]], cameras: ['CAM_01', 'CAM_02', 'CAM_03'], start_time: '10:20:00', end_time: '10:32:12', flagged: 1, created_at: new Date().toISOString() },
    ],
  });

// ─────────────────────────── Reports ──────────────────────────────────────

export const getReportSummary = () =>
  apiFetch<ReportSummary>('/api/reports/summary', undefined, {
    summary: {
      total_vehicles_today: 14820,
      flagged_vehicles: 12,
      total_anpr_reads: 8940,
      flagged_plates: 8,
      total_alerts: 15,
      critical_alerts: 3,
      watchlist_active: 3,
      cameras_online: 6,
    },
    report_date: new Date().toISOString().split('T')[0],
  });
