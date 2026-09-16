// UrbanTrax AI — Sample data (replace with FastAPI WebSocket feed)

export const cameras = [
  { id: 'CAM-001', name: 'MG Road Junction', location: 'MG Road, Zone A', lat: 52, lng: 38, status: 'online', fps: 30, traffic: 'high', vehicles: 47, mapX: 38, mapY: 28 },
  { id: 'CAM-002', name: 'Yeshwanthpur Junction', location: 'Yeshwanthpur, Zone B', lat: 48, lng: 44, status: 'online', fps: 24, traffic: 'moderate', vehicles: 29, mapX: 52, mapY: 22 },
  { id: 'CAM-003', name: 'Hebbal Flyover', location: 'Hebbal, Zone A', lat: 55, lng: 32, status: 'online', fps: 24, traffic: 'high', vehicles: 37, mapX: 28, mapY: 18 },
  { id: 'CAM-004', name: 'Airport Road', location: 'Airport Rd, Zone C', lat: 60, lng: 50, status: 'online', fps: 25, traffic: 'moderate', vehicles: 22, mapX: 64, mapY: 12 },
  { id: 'CAM-005', name: 'Electronic City Toll', location: 'Electronic City, Zone D', lat: 44, lng: 60, status: 'warning', fps: 18, traffic: 'low', vehicles: 11, mapX: 72, mapY: 60 },
  { id: 'CAM-006', name: 'Silk Board Junction', location: 'Silk Board, Zone D', lat: 42, lng: 56, status: 'online', fps: 30, traffic: 'high', vehicles: 53, mapX: 60, mapY: 52 },
  { id: 'CAM-007', name: 'Koramangala 5th Block', location: 'Koramangala, Zone C', lat: 46, lng: 48, status: 'online', fps: 30, traffic: 'moderate', vehicles: 31, mapX: 56, mapY: 42 },
  { id: 'CAM-008', name: 'Whitefield Main Road', location: 'Whitefield, Zone E', lat: 58, lng: 42, status: 'online', fps: 25, traffic: 'low', vehicles: 14, mapX: 78, mapY: 36 },
  { id: 'CAM-009', name: 'Bannerghatta Road', location: 'Bannerghatta, Zone D', lat: 40, lng: 52, status: 'offline', fps: 0, traffic: 'clear', vehicles: 0, mapX: 48, mapY: 68 },
  { id: 'CAM-010', name: 'KR Circle', location: 'KR Circle, Zone A', lat: 50, lng: 40, status: 'online', fps: 24, traffic: 'moderate', vehicles: 26, mapX: 44, mapY: 38 },
  { id: 'CAM-011', name: 'Indiranagar 100ft Road', location: 'Indiranagar, Zone B', lat: 54, lng: 46, status: 'online', fps: 30, traffic: 'high', vehicles: 41, mapX: 62, mapY: 30 },
  { id: 'CAM-012', name: 'Marathahalli Bridge', location: 'Marathahalli, Zone E', lat: 56, lng: 54, status: 'warning', fps: 22, traffic: 'moderate', vehicles: 19, mapX: 74, mapY: 44 },
];

export const kpiData = {
  activeCameras: { online: 9, total: 12, trend: +2 },
  vehiclesDetected: { value: 12482, trend: +3.4 },
  vehiclesTracked: { value: 387, trend: -1.2 },
  anprReads: { value: 3842, trend: +5.1 },
  activeAlerts: { value: 12, critical: 3, warning: 6, info: 3 },
  congestion: { level: 'Moderate', score: 58, trend: +4 },
};

export const alerts = [
  { id: 'ALT-001', type: 'BLACKLISTED VEHICLE', severity: 'critical', subject: 'KA01AB1234', camera: 'CAM-003', location: 'Hebbal Flyover', time: '2 min ago', timestamp: '10:32:14' },
  { id: 'ALT-002', type: 'HEAVY CONGESTION', severity: 'warning', subject: 'MG Road Junction', camera: 'CAM-001', location: 'MG Road', time: '5 min ago', timestamp: '10:29:07' },
  { id: 'ALT-003', type: 'CAMERA OFFLINE', severity: 'info', subject: 'CAM-009', camera: 'CAM-009', location: 'Bannerghatta Road', time: '8 min ago', timestamp: '10:26:45' },
  { id: 'ALT-004', type: 'SPEED VIOLATION', severity: 'warning', subject: 'MH12CD5678', camera: 'CAM-006', location: 'Silk Board Junction', time: '11 min ago', timestamp: '10:23:12' },
  { id: 'ALT-005', type: 'WRONG WAY VEHICLE', severity: 'critical', subject: 'TN09EF9012', camera: 'CAM-002', location: 'Yeshwanthpur Jcn', time: '14 min ago', timestamp: '10:20:05' },
  { id: 'ALT-006', type: 'CAMERA WARNING', severity: 'warning', subject: 'CAM-005', camera: 'CAM-005', location: 'Electronic City Toll', time: '18 min ago', timestamp: '10:16:33' },
];

export const trafficVolumeData = [
  { time: '09:45', vehicles: 310, anpr: 210 },
  { time: '09:50', vehicles: 345, anpr: 232 },
  { time: '09:55', vehicles: 298, anpr: 195 },
  { time: '10:00', vehicles: 412, anpr: 280 },
  { time: '10:05', vehicles: 398, anpr: 265 },
  { time: '10:10', vehicles: 467, anpr: 310 },
  { time: '10:15', vehicles: 523, anpr: 355 },
  { time: '10:20', vehicles: 489, anpr: 320 },
  { time: '10:25', vehicles: 512, anpr: 342 },
  { time: '10:30', vehicles: 548, anpr: 371 },
  { time: '10:34', vehicles: 531, anpr: 356 },
];

export const vehicleDistribution = [
  { name: 'Cars', value: 5841, color: '#3b82f6' },
  { name: 'Motorcycles', value: 3127, color: '#06b6d4' },
  { name: 'Buses', value: 842, color: '#22c55e' },
  { name: 'Trucks', value: 1203, color: '#f59e0b' },
  { name: 'Other', value: 1469, color: '#a855f7' },
];

export const cameraTrafficData = [
  { cam: 'CAM-001', vehicles: 47, color: '#ef4444' },
  { cam: 'CAM-002', vehicles: 29, color: '#f59e0b' },
  { cam: 'CAM-003', vehicles: 37, color: '#ef4444' },
  { cam: 'CAM-004', vehicles: 22, color: '#f59e0b' },
  { cam: 'CAM-006', vehicles: 53, color: '#ef4444' },
  { cam: 'CAM-007', vehicles: 31, color: '#f59e0b' },
  { cam: 'CAM-010', vehicles: 26, color: '#f59e0b' },
  { cam: 'CAM-011', vehicles: 41, color: '#ef4444' },
];

export const detectedVehicles = [
  { id: 'UTX-VH-00124', type: 'SUV', plate: 'KA01AB1234', confidence: 94, trackStatus: 'Tracked', timestamp: '10:32:12', flagged: true },
  { id: 'UTX-VH-00125', type: 'Motorcycle', plate: 'TN09CD5678', confidence: 87, trackStatus: 'Tracked', timestamp: '10:32:18', flagged: false },
  { id: 'UTX-VH-00126', type: 'Bus', plate: 'KA19EF1122', confidence: 91, trackStatus: 'Tracked', timestamp: '10:32:25', flagged: false },
  { id: 'UTX-VH-00127', type: 'Car', plate: '—', confidence: 78, trackStatus: 'Lost', timestamp: '10:32:41', flagged: false },
  { id: 'UTX-VH-00128', type: 'Truck', plate: 'MH12GH9900', confidence: 95, trackStatus: 'Tracked', timestamp: '10:32:55', flagged: false },
  { id: 'UTX-VH-00129', type: 'Car', plate: 'KA03JK4321', confidence: 89, trackStatus: 'Exited', timestamp: '10:33:02', flagged: false },
];

export const anprReads = [
  { plate: 'KA01AB1234', time: '10:32:12', confidence: 94, flagged: true },
  { plate: 'TN09CD5678', time: '10:32:18', confidence: 87, flagged: false },
  { plate: 'KA19EF1122', time: '10:32:25', confidence: 91, flagged: false },
  { plate: 'MH12GH9900', time: '10:32:55', confidence: 95, flagged: false },
  { plate: 'KA03JK4321', time: '10:33:02', confidence: 89, flagged: false },
];

export const eventTimeline = [
  { time: '10:32:12', event: 'Vehicle detected', type: 'detection', id: 'UTX-VH-00124' },
  { time: '10:32:15', event: 'Plate detected — KA01AB1234', type: 'anpr', id: 'UTX-VH-00124' },
  { time: '10:32:16', event: 'ALERT: Blacklisted plate flagged', type: 'alert', id: 'ALT-001' },
  { time: '10:32:18', event: 'Vehicle detected', type: 'detection', id: 'UTX-VH-00125' },
  { time: '10:32:25', event: 'Vehicle detected', type: 'detection', id: 'UTX-VH-00126' },
  { time: '10:32:41', event: 'Vehicle tracking lost', type: 'warning', id: 'UTX-VH-00127' },
  { time: '10:32:55', event: 'Vehicle detected', type: 'detection', id: 'UTX-VH-00128' },
  { time: '10:33:02', event: 'Vehicle exited frame', type: 'exit', id: 'UTX-VH-00129' },
];

export const systemStatus = [
  { name: 'AI Processing', status: 'healthy', latency: '12ms' },
  { name: 'API', status: 'healthy', latency: '4ms' },
  { name: 'Database', status: 'healthy', latency: '8ms' },
  { name: 'WebSocket', status: 'connected', latency: '2ms' },
];
