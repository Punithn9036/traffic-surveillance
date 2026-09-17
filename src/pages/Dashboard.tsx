import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { getTrafficStats, getAlerts, getSystemHealth, TrafficStats, Alert, SystemHealth, Camera } from '../services/api';
import { useApp } from '../context/AppContext';
import { useCameraFeed } from '../services/websocket';
import InteractiveMap, { MapCamera } from '../components/InteractiveMap';

type ChartFilter = '15m' | '1h' | 'today' | 'custom';

// ── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ accent, icon, title, primary, sub, trend, badge }: {
  accent: string; icon: React.ReactNode; title: string;
  primary: string; sub: string; trend?: number; badge?: { label: string; color: string };
}) {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;
  return (
    <div className={`bg-[#0c1220] border border-[#1a2a40] rounded-lg p-4 flex flex-col gap-3 card-accent-${accent} hover:border-[#243348] transition-colors`}>
      <div className="flex items-start justify-between">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center`}
          style={{ background: `rgba(${accentRgb(accent)}, 0.12)` }}>
          <div style={{ color: accentHex(accent) }}>{icon}</div>
        </div>
        {badge && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
            style={{ background: `rgba(${accentRgb(badge.color)}, 0.15)`, color: accentHex(badge.color) }}>
            {badge.label}
          </span>
        )}
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-[10px] font-mono
            ${trendPositive ? 'text-[#4ade80]' : trendNegative ? 'text-[#f87171]' : 'text-[#8899b4]'}`}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              {trendPositive
                ? <path d="M8 4l4 4H4z" />
                : <path d="M8 12l4-4H4z" />}
            </svg>
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <div className="text-[10px] text-[#4d607a] uppercase tracking-wider mb-1">{title}</div>
        <div className="text-xl font-bold text-[#e2eaf3] leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>{primary}</div>
        <div className="text-[10px] text-[#4d607a] mt-1.5">{sub}</div>
      </div>
    </div>
  );
}

function accentHex(name: string) {
  const map: Record<string, string> = {
    blue: '#3b82f6', cyan: '#06b6d4', green: '#22c55e',
    amber: '#f59e0b', red: '#ef4444', purple: '#a855f7',
  };
  return map[name] || '#3b82f6';
}
function accentRgb(name: string) {
  const map: Record<string, string> = {
    blue: '59,130,246', cyan: '6,182,212', green: '34,197,94',
    amber: '245,158,11', red: '239,68,68', purple: '168,85,247',
  };
  return map[name] || '59,130,246';
}

// ── City Map ────────────────────────────────────────────────────────────────────────────────
function CityMap({ cameras, onSelectCamera, selectedCam }: { cameras: Camera[]; onSelectCamera: (id: string) => void; selectedCam: string | null }) {
  const BENGALURU_JUNCTIONS: MapCamera[] = [
    { id: 'CAM_01', name: 'MG Road / Brigade Rd Junction', lat: 12.9716, lng: 77.5946, status: 'active', vehicleCount: 42, speedLimit: 60 },
    { id: 'CAM_02', name: 'Silk Board Junction & Flyover', lat: 12.9172, lng: 77.6228, status: 'warning', vehicleCount: 88, speedLimit: 50 },
    { id: 'CAM_03', name: 'Indiranagar 100ft Road Corridor', lat: 12.9784, lng: 77.6408, status: 'active', vehicleCount: 31, speedLimit: 50 },
    { id: 'CAM_04', name: 'Hebbal Flyover / Airport Highway', lat: 13.0358, lng: 77.5970, status: 'active', vehicleCount: 65, speedLimit: 70 },
    { id: 'CAM_05', name: 'Electronic City Toll Expressway', lat: 12.8452, lng: 77.6602, status: 'active', vehicleCount: 54, speedLimit: 80 },
    { id: 'CAM_06', name: 'Whitefield ITPB Main Gate', lat: 12.9698, lng: 77.7499, status: 'active', vehicleCount: 29, speedLimit: 50 },
    { id: 'CAM_07', name: 'Marathahalli Outer Ring Road', lat: 12.9569, lng: 77.7011, status: 'warning', vehicleCount: 76, speedLimit: 60 },
    { id: 'CAM_08', name: 'Koramangala Sony World Signal', lat: 12.9352, lng: 77.6245, status: 'active', vehicleCount: 48, speedLimit: 50 },
    { id: 'CAM_09', name: 'Jayanagar 4th Block Circle', lat: 12.9293, lng: 77.5824, status: 'active', vehicleCount: 35, speedLimit: 40 },
    { id: 'CAM_10', name: 'Majestic KSR Station Circle', lat: 12.9779, lng: 77.5728, status: 'active', vehicleCount: 92, speedLimit: 50 },
    { id: 'CAM_11', name: 'Rajajinagar Navrang Circle', lat: 12.9926, lng: 77.5552, status: 'active', vehicleCount: 41, speedLimit: 50 },
    { id: 'CAM_12', name: 'Banashankari TTMC Junction', lat: 12.9255, lng: 77.5738, status: 'active', vehicleCount: 50, speedLimit: 50 },
  ];

  const mapCameras: MapCamera[] = cameras.length > 0
    ? cameras.map((c, i) => ({
        id: c.id,
        name: c.name || `Junction Camera ${c.id}`,
        lat: c.lat || BENGALURU_JUNCTIONS[i % BENGALURU_JUNCTIONS.length].lat,
        lng: c.lng || BENGALURU_JUNCTIONS[i % BENGALURU_JUNCTIONS.length].lng,
        status: c.status === 'online' ? 'active' : c.status === 'warning' ? 'warning' : 'offline',
        vehicleCount: c.vehicles || Math.floor(Math.random() * 50) + 20,
        speedLimit: 60,
      }))
    : BENGALURU_JUNCTIONS;

  return (
    <div className="bg-[#0c1220] border border-[#1a2a40] rounded-xl flex flex-col overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2a40] bg-[#0d1424]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <div>
            <div className="text-xs font-bold text-[#e2eaf3] uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Live GIS City Traffic Map — All City Junctions
            </div>
            <div className="text-[10px] text-[#4d607a]">Interactive Google Maps / Leaflet GIS Surveillance Feed</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#8899bb]">
          <span className="bg-[#141c30] px-2 py-0.5 rounded border border-[#1e2d4a]">
            {mapCameras.length} Active Junction Cameras
          </span>
        </div>
      </div>
      <div className="p-2 bg-[#080d18]">
        <InteractiveMap
          cameras={mapCameras}
          selectedCameraId={selectedCam || undefined}
          onSelectCamera={onSelectCamera}
          height="360px"
        />
      </div>
    </div>
  );
}

// ── Dashboard Live Camera Feed Component ──────────────────────────────────────
function DashboardLiveFeed({
  cameraId,
  cameras,
  onSelectCamera,
  onOpenDetail,
}: {
  cameraId: string;
  cameras: Camera[];
  onSelectCamera: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  const currentCam = cameras.find(c => c.id === cameraId) || cameras[0];
  const activeId = currentCam?.id || cameraId || 'CAM-001';
  const { frameUrl, connected, timestamp, metadata } = useCameraFeed(activeId, true);

  const quickCams = cameras.slice(0, 6);

  return (
    <div className="bg-[#0c1220] border border-[#1a2a40] rounded-xl flex flex-col overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2a40] bg-[#0d1424]">
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-[#22c55e] animate-pulse' : 'bg-[#ef4444]'}`} />
          <div>
            <div className="text-xs font-bold text-[#e2eaf3] flex items-center gap-2">
              <span>LIVE CAMERA STREAM — {activeId}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-[#3b82f615] text-[#60a5fa] border border-[#3b82f630]">
                AICITY DATASET FEED
              </span>
            </div>
            <div className="text-[10px] text-[#4d607a]">
              {currentCam?.name || 'Surveillance Feed'} • Zone: {currentCam?.zone || 'Zone A'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-[#141c2e] p-1 rounded-md border border-[#1e2d45]">
            {quickCams.map(c => (
              <button
                key={c.id}
                onClick={() => onSelectCamera(c.id)}
                className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all ${
                  (c.id === activeId)
                    ? 'bg-[#3b82f6] text-white font-bold'
                    : 'text-[#8899b4] hover:text-white hover:bg-[#1e2d45]'
                }`}
              >
                {c.id.replace('CAM-', 'C')}
              </button>
            ))}
          </div>

          <button
            onClick={() => onOpenDetail(activeId)}
            className="text-[11px] px-2.5 py-1 rounded bg-[#3b82f615] text-[#60a5fa] border border-[#3b82f630] hover:bg-[#3b82f630] transition-colors flex items-center gap-1"
          >
            <span>Expand</span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293-2.293a1 1 0 11-1.414 1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative bg-[#080d18] flex items-center justify-center overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '380px' }}>
        {frameUrl ? (
          <img
            src={frameUrl}
            alt={`Live stream ${activeId}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-[#0c1220]">
            <div className="w-8 h-8 rounded-full border-2 border-t-[#3b82f6] border-r-transparent border-b-[#3b82f6] border-l-transparent animate-spin mb-3" />
            <div className="text-xs font-mono text-[#8899b4]">CONNECTING TO LIVE AICITY SURVEILLANCE FEED...</div>
            <div className="text-[10px] text-[#4d607a] mt-1">{activeId} • WebSocket @ 8000</div>
          </div>
        )}

        {/* Scanline */}
        <div className="absolute inset-0 pointer-events-none opacity-15 overflow-hidden">
          <div
            style={{
              width: '100%',
              height: '2px',
              background: 'rgba(59,130,246,0.6)',
              animation: 'scan-line 4s linear infinite',
              position: 'absolute',
              top: 0,
            }}
          />
        </div>

        {/* HUD Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#070c17]/80 backdrop-blur-sm border border-[#1a2a40] text-[10px] font-mono font-bold">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#22c55e] animate-pulse' : 'bg-[#ef4444]'}`} />
          <span className={connected ? 'text-[#4ade80]' : 'text-[#f87171]'}>{connected ? 'LIVE FEED' : 'CONNECTING'}</span>
        </div>

        <div className="absolute top-3 right-3 px-2 py-1 rounded bg-[#070c17]/80 backdrop-blur-sm border border-[#1a2a40] text-[10px] font-mono text-right">
          <div className="text-[#4d607a] text-[8px]">REID / DETECTIONS</div>
          <div className="text-[#06b6d4] font-bold">{metadata?.detections?.length || currentCam?.vehicles || 0} ACTIVE</div>
        </div>

        <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-[#070c17]/80 backdrop-blur-sm border border-[#1a2a40] text-[9px] font-mono text-[#8899b4]">
          {timestamp || new Date().toLocaleTimeString()} IST • 10.0 FPS • AICity Track 1
        </div>
      </div>
    </div>
  );
}

// ΓöÇΓöÇ Alerts Panel ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const sevClass = (s: string) =>
    s === 'critical' ? 'severity-critical' :
    s === 'warning' ? 'severity-warning' :
    s === 'high' ? 'severity-warning' : 'severity-info';
  const sevColor = (s: string) =>
    s === 'critical' ? '#f87171' : (s === 'warning' || s === 'high') ? '#fbbf24' : '#60a5fa';

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-[#0c1220] border border-[#1a2a40] rounded-lg flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2a40]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#e2eaf3]" style={{ fontFamily: 'Outfit, sans-serif' }}>Live Alerts</span>
          <span className="text-[9px] bg-[#ef4444] text-white rounded-full px-1.5 py-0.5 font-bold">{alerts.length}</span>
        </div>
        <button className="text-[10px] text-[#3b82f6] hover:text-[#60a5fa]">View All →</button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hidden divide-y divide-[#0f1a2e]">
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-[#4d607a]">No recent alerts</div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className={`p-3 ${sevClass(alert.severity)} transition-colors hover:opacity-90`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: sevColor(alert.severity) }}>
                  {alert.type}
                </span>
                <span className="text-[9px] text-[#4d607a] font-mono whitespace-nowrap">{formatTime(alert.timestamp)}</span>
              </div>
              <div className="text-[11px] text-[#c8d6e8] font-semibold font-mono">{alert.subject}</div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[9px] text-[#4d607a]">{alert.camera} • {alert.location || 'Unknown'}</span>
                <button className="text-[9px] px-2 py-0.5 border border-[#243348] rounded text-[#8899b4] hover:border-[#3b82f6] hover:text-[#60a5fa] transition-colors">
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────
function ChartFilterBar({ active, onChange }: { active: ChartFilter; onChange: (f: ChartFilter) => void }) {
  const opts: { label: string; value: ChartFilter }[] = [
    { label: '15m', value: '15m' }, { label: '1h', value: '1h' },
    { label: 'Today', value: 'today' }, { label: 'Custom', value: 'custom' },
  ];
  return (
    <div className="flex items-center gap-1">
      {opts.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`text-[10px] px-2 py-0.5 rounded transition-colors
            ${active === o.value
              ? 'bg-[#1d3a6e] text-[#60a5fa] border border-[#3b82f6]'
              : 'text-[#4d607a] hover:text-[#8899b4] border border-transparent'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const CustomTooltipDark = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111827] border border-[#1a2a40] rounded px-3 py-2 text-[11px]">
      <div className="text-[#4d607a] mb-1 font-mono">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill || '#3b82f6' }} />
          <span className="text-[#8899b4]">{p.name}:</span>
          <span className="text-[#e2eaf3] font-mono font-medium">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ── System Status ──────────────────────────────────────────────────────────
function SystemStatusPanel({ systemHealth }: { systemHealth: SystemHealth | null }) {
  const statusDot = (s: string) =>
    s === 'healthy' || s === 'connected' ? 'bg-[#22c55e] animate-pulse-green' : 'bg-[#f59e0b] animate-pulse-amber';
  const statusText = (s: string) =>
    s === 'healthy' ? 'Healthy' : s === 'connected' ? 'Connected' : 'Degraded';
  const statusColor = (s: string) =>
    s === 'healthy' || s === 'connected' ? 'text-[#4ade80]' : 'text-[#fbbf24]';

  if (!systemHealth) return null;

  return (
    <div className="bg-[#0c1220] border border-[#1a2a40] rounded-lg px-4 py-3">
      <div className="text-[11px] font-semibold text-[#8899b4] mb-3 uppercase tracking-wider">Live System Status</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {systemHealth.services.map(s => (
          <div key={s.name} className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot(s.status)}`} />
            <div>
              <div className="text-[10px] text-[#4d607a]">{s.name}</div>
              <div className={`text-[10px] font-semibold font-mono ${statusColor(s.status)}`}>
                {statusText(s.status)} <span className="text-[#2a3a50]">• {s.latency_ms}ms</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skeleton Loader ────────────────────────────────────────────────────────
function SkeletonLoader() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden bg-[#080d18] animate-pulse">
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#0c1220] border border-[#1a2a40] rounded-lg p-4 h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 340 }}>
          <div className="lg:col-span-2 bg-[#0c1220] border border-[#1a2a40] rounded-lg" />
          <div className="bg-[#0c1220] border border-[#1a2a40] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function Dashboard({ onCameraSelect }: { onCameraSelect: (id: string) => void }) {
  const { cameras, backendOnline } = useApp();
  const [chartFilter, setChartFilter] = useState<ChartFilter>('15m');
  const [selectedCam, setSelectedCam] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);
  const [trafficStats, setTrafficStats] = useState<TrafficStats | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(false);
        const [statsRes, alertsRes, healthRes] = await Promise.allSettled([
          getTrafficStats(),
          getAlerts({ limit: 6 }),
          getSystemHealth()
        ]);
        
        if (!isMounted) return;

        if (statsRes.status === 'fulfilled') {
          setTrafficStats(statsRes.value);
        } else {
          setError(true);
        }

        if (alertsRes.status === 'fulfilled') {
          setRecentAlerts(alertsRes.value.alerts);
        }

        if (healthRes.status === 'fulfilled') {
          setSystemHealth(healthRes.value);
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    
    // Set default selected cam if we have cameras
    if (cameras.length > 0 && !selectedCam) {
      setSelectedCam(cameras[0].id);
    }
    
    return () => { isMounted = false; };
  }, [cameras]);

  const handleCamSelect = (id: string) => {
    setSelectedCam(id);
    onCameraSelect(id);
  };

  if (loading) return <SkeletonLoader />;

  // Calculate congestion color logic for the bar chart fallback if color is missing
  const getCameraColor = (traffic: string) => {
    if (traffic === 'high') return '#ef4444';
    if (traffic === 'moderate') return '#f59e0b';
    return '#22c55e'; // low or clear
  };

  const kpis = trafficStats?.kpi ? [
    {
      accent: 'green', title: 'Active Cameras',
      primary: `${trafficStats.kpi.active_cameras.online} / ${trafficStats.kpi.active_cameras.total}`,
      sub: `${trafficStats.kpi.active_cameras.total - trafficStats.kpi.active_cameras.online} offline`,
      badge: { label: 'Online', color: 'green' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
        </svg>
      ),
    },
    {
      accent: 'blue', title: 'Vehicles Detected',
      primary: trafficStats.kpi.vehicles_detected.toLocaleString(),
      sub: 'Total detections today', 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      accent: 'cyan', title: 'Currently Tracked',
      primary: trafficStats.kpi.vehicles_tracked.toString(),
      sub: 'Active trajectories', 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      accent: 'purple', title: 'ANPR Reads',
      primary: trafficStats.kpi.anpr_reads.toLocaleString(),
      sub: 'Plates read today',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 4V2a1 1 0 00-1-1H4a1 1 0 00-1 1v2M7 4H5M7 4h2m8-2v2m0-2a1 1 0 011-1h2a1 1 0 011 1v2m0 0h-2m0 0h-2M3 10h18M3 6h18M3 14h18M3 18h18" />
        </svg>
      ),
    },
    {
      accent: 'red', title: 'Active Alerts',
      primary: trafficStats.kpi.active_alerts.toString(),
      sub: `Alerts in system`,
      badge: { label: 'Live', color: 'red' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      accent: 'amber', title: 'Current Congestion',
      primary: trafficStats.kpi.congestion_score > 70 ? 'High' : trafficStats.kpi.congestion_score > 40 ? 'Moderate' : 'Low',
      sub: `Congestion index: ${trafficStats.kpi.congestion_score}/100`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ] : [];

  // Congestion calculation for UI
  const congestionStats = trafficStats?.camera_traffic ? [
    { label: 'Clear/Low', count: trafficStats.camera_traffic.filter(c => c.traffic === 'clear' || c.traffic === 'low').length, color: '#22c55e' },
    { label: 'Moderate', count: trafficStats.camera_traffic.filter(c => c.traffic === 'moderate').length, color: '#f59e0b' },
    { label: 'High', count: trafficStats.camera_traffic.filter(c => c.traffic === 'high').length, color: '#ef4444' },
  ].map(s => ({ ...s, pct: trafficStats.camera_traffic.length ? Math.round((s.count / trafficStats.camera_traffic.length) * 100) : 0 })) : [];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden bg-[#080d18]">
      <div className="p-5 space-y-5">
        
        {(!backendOnline || error) && (
          <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg p-3 text-[#fbbf24] text-xs flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Backend offline or unreachable. Showing cached/available data.
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map(k => <KPICard key={k.title} {...k} />)}
        </div>

        {/* Live Camera Stream & GIS Map + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <DashboardLiveFeed
              cameraId={selectedCam || cameras[0]?.id || 'CAM-001'}
              cameras={cameras}
              onSelectCamera={handleCamSelect}
              onOpenDetail={handleCamSelect}
            />
            <CityMap cameras={cameras} onSelectCamera={handleCamSelect} selectedCam={selectedCam} />
          </div>
          <div className="lg:col-span-1">
            <AlertsPanel alerts={recentAlerts} />
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Traffic Volume */}
          <div className="lg:col-span-2 bg-[#0c1220] border border-[#1a2a40] rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-[#e2eaf3]" style={{ fontFamily: 'Outfit, sans-serif' }}>Traffic Volume Over Time</div>
                <div className="text-[10px] text-[#4d607a] mt-0.5">Vehicles detected vs ANPR reads</div>
              </div>
              <ChartFilterBar active={chartFilter} onChange={setChartFilter} />
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trafficStats?.time_series || []} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradVehicles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAnpr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0f1a2e" />
                <XAxis dataKey="time" tick={{ fill: '#4d607a', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: '#4d607a', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <Tooltip content={<CustomTooltipDark />} />
                <Area type="monotone" dataKey="vehicles" name="Vehicles" stroke="#3b82f6" strokeWidth={2} fill="url(#gradVehicles)" dot={false} />
                <Area type="monotone" dataKey="anpr" name="ANPR Reads" stroke="#06b6d4" strokeWidth={2} fill="url(#gradAnpr)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Vehicle Distribution donut */}
          <div className="bg-[#0c1220] border border-[#1a2a40] rounded-lg p-4">
            <div className="text-sm font-semibold text-[#e2eaf3] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Vehicle Distribution</div>
            <div className="text-[10px] text-[#4d607a] mb-3">By vehicle type today</div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={trafficStats?.vehicle_types || []} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                  dataKey="value" paddingAngle={2} strokeWidth={0}>
                  {(trafficStats?.vehicle_types || []).map((entry, i) => (
                    <Cell key={i} fill={entry.color || '#3b82f6'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltipDark />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 gap-1 mt-1">
              {(trafficStats?.vehicle_types || []).map(v => (
                <div key={v.name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: v.color || '#3b82f6' }} />
                    <span className="text-[#4d607a]">{v.name}</span>
                  </div>
                  <span className="text-[#8899b4] font-mono">{v.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar + Congestion row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Camera Traffic Volume */}
          <div className="bg-[#0c1220] border border-[#1a2a40] rounded-lg p-4">
            <div className="text-sm font-semibold text-[#e2eaf3] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Camera Traffic Volume</div>
            <div className="text-[10px] text-[#4d607a] mb-3">Current vehicles per camera</div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={trafficStats?.camera_traffic || []} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0f1a2e" vertical={false} />
                <XAxis dataKey="cam" tick={{ fill: '#4d607a', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: '#4d607a', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                <Tooltip content={<CustomTooltipDark />} />
                <Bar dataKey="vehicles" name="Vehicles" radius={[2, 2, 0, 0]}>
                  {(trafficStats?.camera_traffic || []).map((entry, i) => (
                    <Cell key={i} fill={getCameraColor(entry.traffic)} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Congestion distribution */}
          <div className="bg-[#0c1220] border border-[#1a2a40] rounded-lg p-4">
            <div className="text-sm font-semibold text-[#e2eaf3] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Congestion Distribution</div>
            <div className="text-[10px] text-[#4d607a] mb-4">Traffic level across all cameras</div>
            {congestionStats.map(row => (
              <div key={row.label} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                    <span className="text-[10px] text-[#8899b4]">{row.label}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#4d607a]">{row.count} cameras • {row.pct}%</div>
                </div>
                <div className="progress-bar" style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div className="progress-bar-fill" style={{ height: '100%', width: `${row.pct}%`, background: row.color, transition: 'width 1s ease-in-out' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        {systemHealth && <SystemStatusPanel systemHealth={systemHealth} />}
      </div>
    </div>
  );
}
