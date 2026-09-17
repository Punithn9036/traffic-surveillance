/**
 * websocket.ts — React hook for live camera WebSocket feeds
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_BASE = (() => {
  const apiUrl = (import.meta.env.VITE_API_URL as string) || '';
  if (apiUrl) {
    return apiUrl.replace(/^http/, 'ws');
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' && window.location.port !== '8000'
    ? `${window.location.hostname || 'localhost'}:8000`
    : window.location.host;
  return `${proto}//${host}`;
})();

export interface CameraMetadata {
  alerts: Array<{ type: string; plate_text?: string; camera_id?: string; timestamp?: string }>;
  detections: Array<{ id: string; type: string; plate?: string; confidence?: number }>;
  anpr: Array<{ plate: string; confidence: number }>;
}

export interface CameraFeedState {
  frameUrl: string | null;
  metadata: CameraMetadata;
  connected: boolean;
  error: string | null;
  timestamp: string | null;
}

export function useCameraFeed(cameraId: string | null, enabled = true): CameraFeedState {
  const [state, setState] = useState<CameraFeedState>({
    frameUrl: null,
    metadata: { alerts: [], detections: [], anpr: [] },
    connected: false,
    error: null,
    timestamp: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!cameraId || !enabled || !mountedRef.current) return;

    const url = `${WS_BASE}/ws/camera/${cameraId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, connected: true, error: null }));
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        setState(prev => ({
          ...prev,
          frameUrl: data.frame || prev.frameUrl,
          metadata: data.metadata || prev.metadata,
          timestamp: data.timestamp || null,
        }));
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, connected: false, error: 'Connection error' }));
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, connected: false, frameUrl: null }));
      // Reconnect after 3 seconds
      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, 3000);
    };
  }, [cameraId, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled && cameraId) connect();

    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, enabled, cameraId]);

  return state;
}
