/**
 * websocket.ts — Multi-device resilient React hook for live camera WebSocket feeds
 */

import { useState, useEffect, useRef, useCallback } from 'react';

let workingWsBase: string | null = null;

export function getWsCandidates(cameraId: string): string[] {
  if (typeof window === 'undefined') return [];
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const candidates: string[] = [];

  const envUrl = (import.meta.env.VITE_API_URL as string) || '';
  if (envUrl) {
    candidates.push(`${envUrl.replace(/^http/, 'ws')}/ws/camera/${cameraId}`);
  }

  // If a working base was previously discovered, prioritize it
  if (workingWsBase) {
    candidates.push(`${workingWsBase}/ws/camera/${cameraId}`);
  }

  // 1. Same-origin (Vite dev/preview server proxy or production reverse proxy)
  candidates.push(`${proto}//${window.location.host}/ws/camera/${cameraId}`);

  // 2. Direct backend on port 8000 using current hostname (for LAN devices or localhost)
  if (window.location.port !== '8000') {
    const hostname = window.location.hostname || 'localhost';
    candidates.push(`${proto}//${hostname}:8000/ws/camera/${cameraId}`);
  }

  // 3. 127.0.0.1 direct fallback
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    candidates.push(`ws://127.0.0.1:8000/ws/camera/${cameraId}`);
  }

  // Return unique candidates preserving order
  return Array.from(new Set(candidates));
}

export function getWebSocketUrl(cameraId: string): string {
  const candidates = getWsCandidates(cameraId);
  return candidates[0] || `ws://localhost:8000/ws/camera/${cameraId}`;
}

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
  const candidateIndexRef = useRef(0);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!cameraId || !enabled || !mountedRef.current) return;

    const candidates = getWsCandidates(cameraId);
    if (candidates.length === 0) return;

    const candidateIdx = candidateIndexRef.current % candidates.length;
    const url = candidates[candidateIdx];

    try {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        // Save the successful base URL for all future connections
        const match = url.match(/^(wss?:\/\/[^/]+)/);
        if (match) {
          workingWsBase = match[1];
        }
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
        // Try next candidate URL on error
        candidateIndexRef.current += 1;
        setState(prev => ({ ...prev, connected: false, error: 'Connection error' }));
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setState(prev => ({ ...prev, connected: false }));
        // Reconnect after 2 seconds
        reconnectRef.current = setTimeout(() => {
          if (mountedRef.current && enabled) connect();
        }, 2000);
      };
    } catch (err) {
      candidateIndexRef.current += 1;
    }
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
