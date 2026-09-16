import { useState } from 'react';
import { cameras } from '../data/mockData';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'online' | 'offline' | 'warning';
type TrafficFilter = 'all' | 'clear' | 'low' | 'moderate' | 'high';

// ── Simulated CV Annotations ──────────────────────────────────────────────
const cameraAnnotations: Record<string, Array<{
  x: number; y: number; w: number; h: number;
  id: string; type: string; conf: number; plate?: string; color: 'blue' | 'green' | 'amber'
}>> = {
  'CAM-001': [
    { x: 12, y: 35, w: 28, h: 22, id: '#024', type: 'Car', conf: 94, plate: 'KA01AB1234', color: 'blue' },
    { x: 52, y: 45, w: 18, h: 15, id: '#025', type: 'Bike', conf: 87, color: 'green' },
    { x: 74, y: 30, w: 20, h: 35, id: '#026', type: 'Bus', conf: 91, color: 'green' },
  ],
  'CAM-002': [
    { x: 20, y: 40, w: 22, h: 20, id: '#031', type: 'Bike', conf: 87, color: 'green' },
    { x: 56, y: 32, w: 30, h: 28, id: '#032', type: 'Truck', conf: 92, plate: 'MH12GH9900', color: 'blue' },
  ],
  'CAM-003': [
    { x: 10, y: 42, w: 25, h: 18, id: '#040', type: 'Car', conf: 96, plate: 'KA19EF1122', color: 'blue' },
    { x: 48, y: 38, w: 20, h: 18, id: '#041', type: 'Car', conf: 83, color: 'green' },
    { x: 72, y: 44, w: 16, h: 14, id: '#042', type: 'Bike', conf: 79, color: 'amber' },
  ],
  'CAM-004': [
    { x: 30, y: 40, w: 32, h: 24, id: '#055', type: 'SUV', conf: 95, plate: 'TN09CD5678', color: 'blue' },
  ],
};

// ── CV overlay box component ─────────────────────────────────────────────
function CVBox({ ann }: { ann: typeof cameraAnnotations[string][number] }) {
  const borderColor = ann.color === 'blue' ? 'rgba(59,130,246,0.85)' :
    ann.color === 'green' ? 'rgba(34,197,94,0.85)' : 'rgba(245,158,11,0.85)';
  const textColor = ann.color === 'blue' ? '#93c5fd' :
    ann.color === 'green' ? '#86efac' : '#fcd34d';
  const bgColor = ann.color === 'blue' ? 'rgba(59,130,246,0.12)' :
    ann.color === 'green' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)';
  const shadow = ann.color === 'blue' ? '0 0 8px rgba(59,130,246,0.4)' :
    ann.color === 'green' ? '0 0 8px rgba(34,197,94,0.3)' : '0 0 8px rgba(245,158,11,0.3)';

  return (
    <div
      className="absolute"
      style={{
        left: `${ann.x}%`, top: `${ann.y}%`,
        width: `${ann.w}%`, height: `${ann.h}%`,
        border: `1.5px solid ${borderColor}`,
        background: bgColor,
        boxShadow: shadow,
      }}
    >
      {/* Top-left label */}
      <div className="absolute -top-4 left-0 flex items-center gap-1">
        <span className="text-[8px] font-mono px-1 py-0.5 rounded-sm" style={{ background: borderColor, color: '#000' }}>
          {ann.id}
        </span>
        <span className="text-[8px] font-mono" style={{ color: textColor }}>{ann.type}</span>
        <span className="text-[8px] font-mono text-[#4d607a]">{ann.conf}%</span>
      </div>
      {/* Plate if detected */}
      {ann.plate && (
        <div className="absolute -bottom-4 left-0">
          <span className="text-[8px] font-mono px-1 py-0.5 rounded-sm bg-[#1a2a40] text-[#60a5fa] border border-[#3b82f6] border-opacity-50">
            {ann.plate}
          </span>
        </div>
      )}
      {/* Corner marks */}
      <div className="absolute top-0 left-0 w-2 h-0.5" style={{ background: borderColor }} />
      <div className="absolute top-0 left-0 w-0.5 h-2" style={{ background: borderColor }} />
      <div className="absolute top-0 right-0 w-2 h-0.5" style={{ background: borderColor }} />
      <div className="absolute top-0 right-0 w-0.5 h-2" style={{ background: borderColor }} />
      <div className="absolute bottom-0 left-0 w-2 h-0.5" style={{ background: borderColor }} />
      <div className="absolute bottom-0 left-0 w-0.5 h-2" style={{ background: borderColor }} />
      <div className="absolute bottom-0 right-0 w-2 h-0.5" style={{ background: borderColor }} />
      <div className="absolute bottom-0 right-0 w-0.5 h-2" style={{ background: borderColor }} />
    </div>
  );
}

// ── Camera Card ──────────────────────────────────────────────────────────
function CameraCard({ cam, onSelect, showOverlays }: {
  cam: typeof cameras[number];
  onSelect: () => void;
  showOverlays: boolean;
}) {
  const statusInfo = {
    online: { label: 'LIVE', dotClass: 'bg-[#22c55e] animate-pulse-green', textClass: 'text-[#4ade80]', borderClass: 'border-[#1a2a40]' },
    offline: { label: 'OFFLINE', dotClass: 'bg-[#ef4444]', textClass: 'text-[#f87171]', borderClass: 'border-[#2a1a1a]' },
    warning: { label: 'WARNING', dotClass: 'bg-[#f59e0b] animate-pulse-amber', textClass: 'text-[#fbbf24]', borderClass: 'border-[#2a2010]' },
    connecting: { label: 'CONNECTING', dotClass: 'bg-[#3b82f6] animate-pulse', textClass: 'text-[#60a5fa]', borderClass: 'border-[#1a2440]' },
  }[cam.status] ?? { label: 'UNKNOWN', dotClass: 'bg-[#4d607a]', textClass: 'text-[#4d607a]', borderClass: 'border-[#1a2a40]' };

  const trafficBadge: Record<string, string> = {
    high: 'traffic-high', moderate: 'traffic-moderate', low: 'traffic-low', clear: 'traffic-clear',
  };

  const annotations = cameraAnnotations[cam.id] || [];
  const isOffline = cam.status === 'offline';

  return (
    <div
      className={`bg-[#0c1220] border rounded-lg overflow-hidden cursor-pointer group hover:border-[#3b82f6] transition-all hover:shadow-lg hover:shadow-blue-900/20 ${statusInfo.borderClass}`}
      onClick={onSelect}
    >
      {/* Video viewport */}
      <div className="camera-feed relative" style={{ aspectRatio: '16/9' }}>
        {/* Scanline effect */}
        {!isOffline && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-20">
            <div style={{
              width: '100%', height: '2px', background: 'rgba(59,130,246,0.4)',
              animation: 'scan-line 4s linear infinite',
              position: 'absolute', top: 0,
            }} />
          </div>
        )}

        {/* Camera state overlays */}
        {isOffline && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#050810]">
            <div className="w-8 h-8 rounded-full bg-[#1a0a0a] border border-[#2a1010] flex items-center justify-center mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={1.5} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div className="text-[10px] text-[#f87171] font-mono font-medium">CAMERA OFFLINE</div>
            <div className="text-[9px] text-[#4d607a] mt-1">Unable to connect to camera</div>
            <button className="mt-2 text-[9px] border border-[#3b82f6] text-[#60a5fa] px-2 py-0.5 rounded hover:bg-[#1a2a40] transition-colors">
              Retry
            </button>
          </div>
        )}

        {cam.status === 'warning' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-[#1a1000] border border-[#f59e0b] rounded px-2 py-0.5">
            <span className="text-[8px] font-mono text-[#fbbf24]">⚠ SIGNAL DEGRADED</span>
          </div>
        )}

        {/* CV Annotations */}
        {!isOffline && showOverlays && annotations.map((ann, i) => (
          <CVBox key={i} ann={ann} />
        ))}

        {/* Grid lines (perspective road view) */}
        {!isOffline && (
          <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
            <line x1="0" y1="60" x2="35" y2="30" stroke="#1a2a40" strokeWidth="0.3" />
            <line x1="100" y1="60" x2="65" y2="30" stroke="#1a2a40" strokeWidth="0.3" />
            <line x1="0" y1="60" x2="50" y2="35" stroke="#1a2a40" strokeWidth="0.3" />
            <line x1="100" y1="60" x2="50" y2="35" stroke="#1a2a40" strokeWidth="0.3" />
            <line x1="0" y1="55" x2="100" y2="55" stroke="#1a2a40" strokeWidth="0.2" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="#1a2a40" strokeWidth="0.2" />
            {/* Road markings */}
            <rect x="47" y="40" width="6" height="1.5" fill="#1a2a40" />
            <rect x="47" y="46" width="6" height="1.5" fill="#1a2a40" />
            <rect x="47" y="52" width="6" height="1.5" fill="#1a2a40" />
          </svg>
        )}

        {/* HUD corners */}
        {!isOffline && (
          <>
            <div className="absolute top-1 left-1 w-3 h-3 border-l border-t border-[#3b82f6] border-opacity-60 pointer-events-none" />
            <div className="absolute top-1 right-1 w-3 h-3 border-r border-t border-[#3b82f6] border-opacity-60 pointer-events-none" />
            <div className="absolute bottom-1 left-1 w-3 h-3 border-l border-b border-[#3b82f6] border-opacity-60 pointer-events-none" />
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r border-b border-[#3b82f6] border-opacity-60 pointer-events-none" />
          </>
        )}

        {/* LIVE badge */}
        {!isOffline && (
          <div className="absolute top-2 left-2 flex items-center gap-1 badge-live px-1.5 py-0.5 rounded text-[8px] font-bold font-mono z-20">
            <span className={`w-1 h-1 rounded-full ${statusInfo.dotClass}`} />
            {statusInfo.label}
          </div>
        )}

        {/* Timestamp */}
        {!isOffline && (
          <div className="absolute bottom-2 right-2 text-[8px] font-mono text-[#4d607a] bg-[#070c17] bg-opacity-80 px-1.5 py-0.5 rounded z-20">
            10:34:22
          </div>
        )}

        {/* Vehicle count badge */}
        {!isOffline && cam.vehicles > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-[#070c17] bg-opacity-80 px-1.5 py-0.5 rounded z-20">
            <span className="text-[8px] font-mono text-[#60a5fa]">{cam.vehicles} veh</span>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#e2eaf3] font-mono">{cam.id}</div>
            <div className="text-[10px] text-[#4d607a] mt-0.5">{cam.name}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize font-mono ${trafficBadge[cam.traffic] || ''}`}>
              {cam.traffic}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-[9px] text-[#4d607a] font-mono">
            <span>{cam.fps > 0 ? `${cam.fps} FPS` : '— FPS'}</span>
            <span>{cam.vehicles > 0 ? `${cam.vehicles} vehicles` : 'No vehicles'}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="text-[9px] text-[#60a5fa] hover:text-[#3b82f6] px-1.5 py-0.5 border border-[#1a2a40] rounded hover:border-[#3b82f6] transition-colors">
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Camera Row (list view) ────────────────────────────────────────────────
function CameraRow({ cam, onSelect }: { cam: typeof cameras[number]; onSelect: () => void }) {
  const statusColor = cam.status === 'online' ? 'text-[#4ade80]' : cam.status === 'warning' ? 'text-[#fbbf24]' : 'text-[#f87171]';
  const statusDot = cam.status === 'online' ? 'bg-[#22c55e] animate-pulse-green' : cam.status === 'warning' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]';
  const trafficColor = cam.traffic === 'high' ? 'text-[#f87171]' : cam.traffic === 'moderate' ? 'text-[#fbbf24]' : 'text-[#4ade80]';

  return (
    <tr className="table-row-hover border-b border-[#0f1a2e] cursor-pointer" onClick={onSelect}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          <span className="text-[11px] font-mono text-[#e2eaf3] font-semibold">{cam.id}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] text-[#8899b4]">{cam.name}</td>
      <td className="px-4 py-3 text-[11px] text-[#4d607a]">{cam.location}</td>
      <td className="px-4 py-3"><span className={`text-[10px] font-mono uppercase ${statusColor}`}>{cam.status}</span></td>
      <td className="px-4 py-3 text-[11px] font-mono text-[#4d607a]">{cam.fps > 0 ? `${cam.fps}` : '—'}</td>
      <td className="px-4 py-3"><span className={`text-[10px] font-mono capitalize ${trafficColor}`}>{cam.traffic}</span></td>
      <td className="px-4 py-3 text-[11px] font-mono text-[#8899b4]">{cam.vehicles}</td>
      <td className="px-4 py-3">
        <button className="text-[9px] text-[#60a5fa] border border-[#1a2a40] rounded px-2 py-0.5 hover:border-[#3b82f6] transition-colors">
          View
        </button>
      </td>
    </tr>
  );
}

// ── Main Live Cameras ──────────────────────────────────────────────────────
export default function LiveCameras({ onSelectCamera }: { onSelectCamera: (id: string) => void }) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [trafficFilter, setTrafficFilter] = useState<TrafficFilter>('all');
  const [search, setSearch] = useState('');
  const [showOverlays, setShowOverlays] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const filtered = cameras.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (trafficFilter !== 'all' && c.traffic !== trafficFilter) return false;
    if (search && !c.id.toLowerCase().includes(search.toLowerCase()) &&
        !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const onlineCount = cameras.filter(c => c.status === 'online').length;
  const offlineCount = cameras.filter(c => c.status === 'offline').length;
  const warningCount = cameras.filter(c => c.status === 'warning').length;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden bg-[#080d18]">
      <div className="p-5 space-y-4">

        {/* Stats row */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse-green" />
            <span className="text-[#4d607a]">Online</span>
            <span className="text-[#4ade80] font-semibold">{onlineCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            <span className="text-[#4d607a]">Warning</span>
            <span className="text-[#fbbf24] font-semibold">{warningCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            <span className="text-[#4d607a]">Offline</span>
            <span className="text-[#f87171] font-semibold">{offlineCount}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[#4d607a]">
            {autoRefresh && <span className="text-[#22c55e] animate-pulse-green">● AUTO-REFRESH</span>}
            <span className="text-[#2a3a50]">· Updated just now</span>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 bg-[#0c1220] border border-[#1a2a40] rounded-md px-3 py-1.5 w-52">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-[#4d607a] flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search camera..."
              className="bg-transparent text-[11px] text-[#8899b4] placeholder-[#2a3a50] outline-none w-full"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-[#0c1220] border border-[#1a2a40] text-[11px] text-[#8899b4] rounded-md px-2 py-1.5 outline-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="warning">Warning</option>
          </select>

          {/* Traffic filter */}
          <select
            value={trafficFilter}
            onChange={e => setTrafficFilter(e.target.value as TrafficFilter)}
            className="bg-[#0c1220] border border-[#1a2a40] text-[11px] text-[#8899b4] rounded-md px-2 py-1.5 outline-none cursor-pointer"
          >
            <option value="all">All Traffic</option>
            <option value="clear">Clear</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>

          <div className="flex-1" />

          {/* Overlays toggle */}
          <button
            onClick={() => setShowOverlays(v => !v)}
            className={`text-[10px] px-3 py-1.5 border rounded-md transition-colors ${showOverlays ? 'border-[#3b82f6] text-[#60a5fa] bg-[#1a2a40]' : 'border-[#1a2a40] text-[#4d607a]'}`}
          >
            CV Overlays
          </button>

          {/* Auto-refresh */}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`text-[10px] px-3 py-1.5 border rounded-md transition-colors ${autoRefresh ? 'border-[#22c55e] text-[#4ade80] bg-[#0a1a0e]' : 'border-[#1a2a40] text-[#4d607a]'}`}
          >
            Auto Refresh
          </button>

          {/* View toggle */}
          <div className="flex items-center bg-[#0c1220] border border-[#1a2a40] rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[#1a2a40] text-[#60a5fa]' : 'text-[#4d607a] hover:text-[#8899b4]'}`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 transition-colors ${viewMode === 'list' ? 'bg-[#1a2a40] text-[#60a5fa]' : 'text-[#4d607a] hover:text-[#8899b4]'}`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Fullscreen */}
          <button className="text-[#4d607a] hover:text-[#8899b4] p-1.5 border border-[#1a2a40] rounded-md transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Results count */}
        <div className="text-[10px] text-[#4d607a] font-mono">
          Showing {filtered.length} of {cameras.length} cameras
        </div>

        {/* Grid view */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(cam => (
              <CameraCard key={cam.id} cam={cam} showOverlays={showOverlays} onSelect={() => onSelectCamera(cam.id)} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-[#4d607a]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-10 h-10 mb-3 opacity-40">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                <div className="text-sm">No cameras match your filters</div>
              </div>
            )}
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && (
          <div className="bg-[#0c1220] border border-[#1a2a40] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a2a40]">
                  {['Camera ID', 'Name', 'Location', 'Status', 'FPS', 'Traffic', 'Vehicles', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] text-[#4d607a] uppercase tracking-wider font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(cam => (
                  <CameraRow key={cam.id} cam={cam} onSelect={() => onSelectCamera(cam.id)} />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-[#4d607a] text-sm">No cameras match your filters</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
