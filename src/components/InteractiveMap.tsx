import { useEffect, useRef, useState, Component, type ReactNode } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation, ZoomIn, ZoomOut } from 'lucide-react'

// Fix Leaflet default marker icon path safely
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
} catch {
  // Ignore in SSR / strict environments
}

export interface MapCamera {
  id: string
  name: string
  lat: number
  lng: number
  status: 'active' | 'warning' | 'offline'
  vehicleCount?: number
  speedLimit?: number
}

export interface MapTrajectoryPoint {
  lat: number
  lng: number
  camera_id: string
  timestamp?: string
  speed?: string
}

interface Props {
  cameras?: MapCamera[]
  trajectoryPoints?: MapTrajectoryPoint[]
  selectedCameraId?: string
  onSelectCamera?: (camId: string) => void
  center?: [number, number]
  zoom?: number
  height?: string
}

const DEFAULT_CAMERAS: MapCamera[] = [
  { id: 'CAM_01', name: 'MG Road Junction', lat: 12.9716, lng: 77.5946, status: 'active', vehicleCount: 42, speedLimit: 60 },
  { id: 'CAM_02', name: 'Silk Board Flyover', lat: 12.9172, lng: 77.6228, status: 'warning', vehicleCount: 88, speedLimit: 50 },
  { id: 'CAM_03', name: 'Indiranagar 100ft Rd', lat: 12.9784, lng: 77.6408, status: 'active', vehicleCount: 31, speedLimit: 50 },
  { id: 'CAM_04', name: 'Hebbal Flyover', lat: 13.0358, lng: 77.5970, status: 'active', vehicleCount: 65, speedLimit: 70 },
  { id: 'CAM_05', name: 'Electronic City Toll', lat: 12.8452, lng: 77.6602, status: 'active', vehicleCount: 54, speedLimit: 80 },
  { id: 'CAM_06', name: 'Whitefield Main Rd', lat: 12.9698, lng: 77.7499, status: 'active', vehicleCount: 29, speedLimit: 50 },
]

export default function InteractiveMap({
  cameras = DEFAULT_CAMERAS,
  trajectoryPoints = [],
  selectedCameraId,
  onSelectCamera,
  center = [12.9716, 77.5946],
  zoom = 12,
  height = '360px',
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<{ [id: string]: L.Marker }>({})
  const polylineRef = useRef<L.Polyline | null>(null)
  const [tileLayerType, setTileLayerType] = useState<'dark' | 'satellite' | 'street'>('dark')
  const [hasError, setHasError] = useState(false)

  // Tile providers — Stadia dark is free (localhost: no key, production: free tier)
  const stadiaKey = (import.meta as any).env?.VITE_STADIA_KEY || ''
  const TILE_LAYERS = {
    dark: {
      url: `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png${stadiaKey ? `?api_key=${stadiaKey}` : ''}`,
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN',
      subdomains: 'abc',
      maxZoom: 19,
    },
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abc',
      maxZoom: 19,
    },
  }

  // Safe Leaflet Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return

    // Prevent duplicate map initialization error
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id
    }
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove() } catch { /* ignore */ }
      mapInstanceRef.current = null
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: false,
      })

      const cfg = TILE_LAYERS.dark
      const initialTileLayer = L.tileLayer(cfg.url, {
        maxZoom: cfg.maxZoom,
        attribution: cfg.attribution,
        subdomains: cfg.subdomains,
      }).addTo(map)

      ;(map as any)._customTileLayer = initialTileLayer
      mapInstanceRef.current = map

      const resizeTimer = setTimeout(() => {
        try { map.invalidateSize() } catch { /* ignore */ }
      }, 200)

      const handleResize = () => {
        try { map.invalidateSize() } catch { /* ignore */ }
      }
      window.addEventListener('resize', handleResize)

      return () => {
        clearTimeout(resizeTimer)
        window.removeEventListener('resize', handleResize)
        try { map.remove() } catch { /* ignore */ }
        mapInstanceRef.current = null
      }
    } catch (err) {
      console.error('Leaflet initialization error:', err)
      setHasError(true)
    }
  }, [])

  // Switch Tile Layer Theme — remove ALL existing tile layers before adding new one
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || hasError) return

    try {
      // Remove every tile layer currently on the map (prevents "API KEY REQUIRED" ghost layers)
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer)
        }
      })

      const cfg = TILE_LAYERS[tileLayerType]
      const newTileLayer = L.tileLayer(cfg.url, {
        maxZoom: cfg.maxZoom,
        attribution: cfg.attribution,
        subdomains: cfg.subdomains,
      }).addTo(map)

      ;(map as any)._customTileLayer = newTileLayer
      map.invalidateSize()
    } catch (err) {
      console.error('Tile layer error:', err)
    }
  }, [tileLayerType, hasError])

  // Render Camera Pins
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || hasError) return

    try {
      Object.values(markersRef.current).forEach((m) => m.remove())
      markersRef.current = {}

      cameras.forEach((cam) => {
        const isSelected = cam.id === selectedCameraId
        const statusColor = cam.status === 'warning' ? '#ef4444' : '#22c55e'

        const iconHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background-color: ${statusColor}30; border: 2px solid ${statusColor};"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${isSelected ? '#3b82f6' : statusColor}; border: 2px solid #ffffff; box-shadow: 0 0 10px ${statusColor};"></div>
          </div>
        `

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-map-pin',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        const marker = L.marker([cam.lat, cam.lng], { icon: customIcon }).addTo(map)

        const popupContent = `
          <div style="background: #0f1629; color: #f0f4ff; padding: 10px; border-radius: 8px; border: 1px solid #1e2d4a; font-family: sans-serif; min-width: 180px;">
            <div style="font-weight: 700; font-size: 13px; color: #3b82f6; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
              <span>${cam.name}</span>
              <span style="font-size: 10px; font-family: monospace; background: #1e2d4a; padding: 2px 6px; border-radius: 4px;">${cam.id}</span>
            </div>
            <div style="font-size: 11px; color: #8899bb; margin-bottom: 8px;">GPS: ${cam.lat.toFixed(4)}, ${cam.lng.toFixed(4)}</div>
            <div style="display: flex; gap: 8px; font-size: 11px; font-family: monospace;">
              <div style="background: #141c30; padding: 4px 8px; border-radius: 4px; flex: 1;">
                <div style="color: #4a6080; font-size: 9px;">VEHICLES</div>
                <div style="color: #22c55e; font-weight: 600;">${cam.vehicleCount || 0}/m</div>
              </div>
              <div style="background: #141c30; padding: 4px 8px; border-radius: 4px; flex: 1;">
                <div style="color: #4a6080; font-size: 9px;">SPEED LIMIT</div>
                <div style="color: #f59e0b; font-weight: 600;">${cam.speedLimit || 60} km/h</div>
              </div>
            </div>
          </div>
        `

        marker.bindPopup(popupContent)
        marker.on('click', () => {
          if (onSelectCamera) onSelectCamera(cam.id)
        })

        markersRef.current[cam.id] = marker
      })
    } catch (err) {
      console.error('Marker rendering error:', err)
    }
  }, [cameras, selectedCameraId, hasError])

  // Render Trajectory Polyline
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || hasError) return

    try {
      if (polylineRef.current) {
        polylineRef.current.remove()
        polylineRef.current = null
      }

      if (trajectoryPoints.length > 0) {
        const latLngs = trajectoryPoints.map((p) => [p.lat, p.lng] as [number, number])

        const polyline = L.polyline(latLngs, {
          color: '#06b6d4',
          weight: 4,
          opacity: 0.9,
          dashArray: '8, 8',
        }).addTo(map)

        polylineRef.current = polyline
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] })
      }
    } catch (err) {
      console.error('Polyline error:', err)
    }
  }, [trajectoryPoints, hasError])

  // Fly to selected camera
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !selectedCameraId || hasError) return

    try {
      const cam = cameras.find((c) => c.id === selectedCameraId)
      if (cam) {
        map.flyTo([cam.lat, cam.lng], 14, { duration: 1.2 })
        const marker = markersRef.current[cam.id]
        if (marker) marker.openPopup()
      }
    } catch (err) {
      console.error('FlyTo error:', err)
    }
  }, [selectedCameraId, hasError])

  if (hasError) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-[#1e2d4a] bg-[#0a0e1a] p-6 flex flex-col items-center justify-center text-center" style={{ height }}>
        <div className="w-10 h-10 rounded-full bg-[#141c30] border border-[#1e2d4a] flex items-center justify-center text-[#3b82f6] mb-3">
          <Navigation size={20} />
        </div>
        <div className="text-sm font-bold text-[#f0f4ff] mb-1">GIS Map View Mode</div>
        <div className="text-xs text-[#8899bb] max-w-sm mb-3">
          Interactive map initialized with {cameras.length} camera checkpoints across Bengaluru.
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {cameras.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCamera?.(c.id)}
              className={`px-2.5 py-1 rounded text-xs border font-mono transition-colors ${
                c.id === selectedCameraId ? 'bg-[#2563eb] text-white border-[#3b82f6]' : 'bg-[#141c30] text-[#8899bb] border-[#1e2d4a]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#1e2d4a] shadow-2xl w-full" style={{ height, minHeight: '340px' }}>
      {/* Map Canvas with Explicit Height */}
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ height: '100%', minHeight: '340px', background: '#0a0e1a' }} />

      {/* Top Left Status Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#0a0e1acc] backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e2d4a]">
        <Navigation size={13} className="text-[#3b82f6] animate-spin" />
        <span className="text-xs font-mono font-semibold text-[#f0f4ff]">BENGALURU GIS METRO TRAFFIC</span>
      </div>

      {/* Top Right Map Style Switcher */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[#0a0e1acc] backdrop-blur-md p-1 rounded-lg border border-[#1e2d4a]">
        <button
          onClick={() => setTileLayerType('dark')}
          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
            tileLayerType === 'dark' ? 'bg-[#2563eb] text-white' : 'text-[#8899bb] hover:text-white'
          }`}
        >
          Dark
        </button>
        <button
          onClick={() => setTileLayerType('satellite')}
          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
            tileLayerType === 'satellite' ? 'bg-[#2563eb] text-white' : 'text-[#8899bb] hover:text-white'
          }`}
        >
          Satellite
        </button>
        <button
          onClick={() => setTileLayerType('street')}
          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
            tileLayerType === 'street' ? 'bg-[#2563eb] text-white' : 'text-[#8899bb] hover:text-white'
          }`}
        >
          Streets
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-8 h-8 rounded-lg bg-[#0a0e1acc] backdrop-blur-md border border-[#1e2d4a] flex items-center justify-center text-[#8899bb] hover:text-white transition-colors"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-8 h-8 rounded-lg bg-[#0a0e1acc] backdrop-blur-md border border-[#1e2d4a] flex items-center justify-center text-[#8899bb] hover:text-white transition-colors"
        >
          <ZoomOut size={16} />
        </button>
      </div>
    </div>
  )
}
