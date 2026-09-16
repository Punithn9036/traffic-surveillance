import { useState } from 'react';

type Page = 'dashboard' | 'live-cameras' | 'camera-detail' | 'vehicle-intelligence' | 'anpr' | 'trajectories' | 'analytics' | 'alerts' | 'watchlist' | 'camera-management' | 'reports' | 'system-health' | 'settings';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const navItems: { id: Page; label: string; icon: string; badge?: number }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'live-cameras', label: 'Live Cameras', icon: 'M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z' },
  { id: 'vehicle-intelligence', label: 'Vehicle Intelligence', icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' },
  { id: 'anpr', label: 'ANPR', icon: 'M7 4V2a1 1 0 00-1-1H4a1 1 0 00-1 1v2M7 4H5M7 4h2m8-2v2m0-2a1 1 0 011-1h2a1 1 0 011 1v2m0 0h-2m0 0h-2M3 10h18M3 6h18M3 14h18M3 18h18' },
  { id: 'trajectories', label: 'Trajectories', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id: 'analytics', label: 'Traffic Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'alerts', label: 'Alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', badge: 12 },
  { id: 'watchlist', label: 'Watchlist', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { id: 'camera-management', label: 'Camera Management', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  { id: 'reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'system-health', label: 'System Health', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function Sidebar({ activePage, onNavigate, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className="sidebar-transition flex flex-col h-full border-r border-[#1a2a40] bg-[#070c17] relative z-20"
      style={{ width: collapsed ? 60 : 220 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-[#1a2a40] min-h-[56px]">
        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-[#3b82f6] flex items-center justify-center">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-sm leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>UrbanTrax AI</div>
            <div className="text-[#4d607a] text-[9px] mt-0.5 leading-none tracking-wider uppercase">Traffic Intelligence</div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-[#4d607a] hover:text-[#8899b4] transition-colors p-0.5 rounded"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            {collapsed
              ? <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              : <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            }
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto scrollbar-hidden">
        {!collapsed && (
          <div className="px-3 py-1.5">
            <span className="text-[#2a3a50] text-[9px] font-semibold tracking-widest uppercase">Navigation</span>
          </div>
        )}
        {navItems.map(item => {
          const isActive = activePage === item.id || (activePage === 'camera-detail' && item.id === 'live-cameras');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-all relative group
                ${isActive
                  ? 'bg-[#1a2a40] text-[#60a5fa]'
                  : 'text-[#6b7f99] hover:text-[#94a3b8] hover:bg-[#0c1525]'
                }`}
              style={{ minHeight: 36 }}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#3b82f6] rounded-r" />
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {!collapsed && (
                <span className="text-xs font-medium leading-none flex-1" style={{ fontFamily: 'Inter, sans-serif' }}>{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="text-[9px] bg-[#ef4444] text-white rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[#1a2a40] py-2">
        {/* System status indicator */}
        <div className={`flex items-center gap-2 px-3.5 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse-green" />
          {!collapsed && <span className="text-[10px] text-[#4d607a]">All Systems Operational</span>}
        </div>
        {/* User */}
        <div className={`flex items-center gap-2.5 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-full bg-[#1a2a40] border border-[#243348] flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] text-[#60a5fa] font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>AK</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-[#c8d6e8] font-medium truncate">Arjun Kumar</div>
              <div className="text-[9px] text-[#4d607a]">Operator</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
