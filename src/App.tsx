import { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Dashboard from './pages/Dashboard';
import LiveCameras from './pages/LiveCameras';
import CameraDetail from './pages/CameraDetail';

type Page = 'dashboard' | 'live-cameras' | 'camera-detail' | 'vehicle-intelligence' | 'anpr' | 'trajectories' | 'analytics' | 'alerts' | 'watchlist' | 'camera-management' | 'reports' | 'system-health' | 'settings';

const pageTitles: Record<Page, { title: string; subtitle: string }> = {
  'dashboard': { title: 'Traffic Intelligence Dashboard', subtitle: 'Real-time city-wide traffic monitoring and vehicle intelligence.' },
  'live-cameras': { title: 'Live Camera Monitoring', subtitle: 'Real-time multi-camera traffic surveillance.' },
  'camera-detail': { title: 'Camera Detail View', subtitle: 'Detailed live view with AI detections and analytics.' },
  'vehicle-intelligence': { title: 'Vehicle Intelligence', subtitle: 'AI-powered vehicle detection, classification and tracking.' },
  'anpr': { title: 'ANPR Engine', subtitle: 'Automated Number Plate Recognition across all cameras.' },
  'trajectories': { title: 'Trajectory Tracking', subtitle: 'Multi-camera vehicle trajectory analysis.' },
  'analytics': { title: 'Traffic Analytics', subtitle: 'Advanced traffic flow analytics and insights.' },
  'alerts': { title: 'Alert Management', subtitle: 'Real-time traffic and security alerts.' },
  'watchlist': { title: 'Vehicle Watchlist', subtitle: 'Tracked and flagged vehicle database.' },
  'camera-management': { title: 'Camera Management', subtitle: 'Camera configuration and maintenance.' },
  'reports': { title: 'Reports', subtitle: 'Generate and export traffic intelligence reports.' },
  'system-health': { title: 'System Health', subtitle: 'AI engine, API, and infrastructure monitoring.' },
  'settings': { title: 'Settings', subtitle: 'Application and user preferences.' },
};

// Placeholder for pages not yet built
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#080d18] text-[#4d607a]">
      <div className="w-12 h-12 rounded-xl bg-[#0c1220] border border-[#1a2a40] flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <div className="text-sm font-semibold text-[#8899b4] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</div>
      <div className="text-[11px] text-[#2a3a50]">This section will be implemented by another teammate</div>
      <div className="mt-3 text-[9px] font-mono text-[#1a2a40] border border-[#1a2a40] rounded px-3 py-1">
        PART 2 / 3 / 4 — PENDING
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [selectedCameraId, setSelectedCameraId] = useState<string>('CAM-003');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleCameraSelect = (id: string) => {
    setSelectedCameraId(id);
    setActivePage('camera-detail');
  };

  const handleNavigate = (page: Page) => {
    setActivePage(page);
  };

  const pageInfo = pageTitles[activePage];

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onCameraSelect={handleCameraSelect} />;
      case 'live-cameras':
        return <LiveCameras onSelectCamera={handleCameraSelect} />;
      case 'camera-detail':
        return <CameraDetail cameraId={selectedCameraId} onBack={() => setActivePage('live-cameras')} />;
      default:
        return <ComingSoon title={pageInfo.title} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#080d18]">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          alertCount={12}
        />
        {renderPage()}
      </div>
    </div>
  );
}
