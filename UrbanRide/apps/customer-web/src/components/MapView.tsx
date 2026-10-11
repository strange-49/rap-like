
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapLocation {
  latitude: number
  longitude: number
}

interface MapViewProps {
  pickup?: MapLocation
  drop?: MapLocation
  height?: string | number
}

interface OsrmResponse {
  code: string
  routes: Array<{
    geometry: GeoJSON.LineString
    distance: number
    duration: number
  }>
}

function createMarker(label: 'A' | 'B', color: string) {
  return L.divIcon({
    className: 'urbanride-map-marker',
    html: `<div style="
      width:36px;height:36px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:${color};
      border:3px solid white;box-shadow:0 3px 9px #0005;
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:15px;font-weight:800;
    "><span style="transform:rotate(45deg)">${label}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  })
}

const pickupIcon = createMarker('A', '#16a34a')
const dropIcon = createMarker('B', '#dc2626')

const currentLocationIcon = L.divIcon({
  className: 'urbanride-current-location',
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#2563eb;border:4px solid white;
    box-shadow:0 0 0 7px #2563eb35,0 2px 8px #0005;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

export function MapView({
  pickup,
  drop,
  height = 420,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const routeRef = useRef<L.LayerGroup | null>(null)
  const currentLocationMarkerRef = useRef<L.Marker | null>(null)

  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [routeMessage, setRouteMessage] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([12.9716, 77.5946], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    mapRef.current = map
    markersRef.current = L.layerGroup().addTo(map)
    routeRef.current = L.layerGroup().addTo(map)

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ pan: false })
    })
    resizeObserver.observe(container)

    const frame = requestAnimationFrame(() => {
      map.invalidateSize({ pan: false })
    })

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markersRef.current = null
      routeRef.current = null
      currentLocationMarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const markers = markersRef.current
    const routeLayer = routeRef.current

    if (!map || !markers || !routeLayer) return

    markers.clearLayers()
    routeLayer.clearLayers()
    setRouteMessage('')

    const start = pickup
      ? L.latLng(pickup.latitude, pickup.longitude)
      : null

    const end = drop
      ? L.latLng(drop.latitude, drop.longitude)
      : null

    if (start) {
      L.marker(start, { icon: pickupIcon })
        .addTo(markers)
        .bindPopup('<strong>A · Pickup</strong>')
    }

    if (end) {
      L.marker(end, { icon: dropIcon })
        .addTo(markers)
        .bindPopup('<strong>B · Destination</strong>')
    }

    if (start && end) {
      if (start.equals(end)) {
        map.setView(start, 15)
        setRouteMessage('Pickup and destination are the same location.')
        return
      }

      const routeStart = start
      const routeEnd = end
      const activeMap = map
      const activeRouteLayer = routeLayer

      activeMap.fitBounds(L.latLngBounds(routeStart, routeEnd), {
        padding: [45, 45],
        maxZoom: 15,
      })

      const controller = new AbortController()

      async function loadRoute() {
        try {
          const coordinates =
            `${routeStart.lng},${routeStart.lat};${routeEnd.lng},${routeEnd.lat}`

          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
            { signal: controller.signal },
          )

          if (!response.ok) {
            throw new Error(`Routing service returned ${response.status}`)
          }

          const result = (await response.json()) as OsrmResponse

          if (result.code !== 'Ok' || !result.routes.length) {
            throw new Error('No driving route was found.')
          }

          if (controller.signal.aborted || mapRef.current !== activeMap) return

          const geometry = result.routes[0].geometry

          L.geoJSON(geometry, {
            style: {
              color: '#ffffff',
              weight: 9,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            },
          }).addTo(activeRouteLayer)

          const route = L.geoJSON(geometry, {
            style: {
              color: '#2563eb',
              weight: 5,
              opacity: 1,
              lineCap: 'round',
              lineJoin: 'round',
            },
          }).addTo(activeRouteLayer)

          const bounds = route.getBounds()
          if (bounds.isValid()) {
            activeMap.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 16,
            })
          }
        } catch {
          if (!controller.signal.aborted) {
            setRouteMessage(
              'The road route could not be loaded. Check your connection and try again.',
            )
          }
        }
      }

      void loadRoute()
      return () => controller.abort()
    }

    const single = start ?? end
    if (single) map.setView(single, 15)
  }, [pickup, drop])

  function handleLocateMe() {
    const map = mapRef.current
    if (!map) return

    if (!navigator.geolocation) {
      setLocationMessage('Your browser does not support location access.')
      return
    }

    setLocating(true)
    setLocationMessage('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = L.latLng(
          position.coords.latitude,
          position.coords.longitude,
        )

        if (mapRef.current !== map) {
          setLocating(false)
          return
        }

        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setLatLng(point)
        } else {
          currentLocationMarkerRef.current = L.marker(point, {
            icon: currentLocationIcon,
            zIndexOffset: 1000,
          }).addTo(map)
        }

        currentLocationMarkerRef.current.bindPopup(
          '<strong>Your current location</strong>',
        )

        map.setView(point, 16, { animate: true })
        setLocating(false)
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied. Allow location access in your browser settings.'
            : error.code === error.TIMEOUT
              ? 'Location request timed out. Please try again.'
              : 'Could not determine your location. Check your device location settings.'

        setLocationMessage(message)
        setLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    )
  }

  const mapHeight = typeof height === 'number' ? `${height}px` : height

  return (
    <div className="urbanride-map-view">
      <div
        ref={containerRef}
        className="urbanride-map-canvas"
        style={{
          width: '100%',
          height: mapHeight,
          minHeight: 280,
          borderRadius: 14,
          overflow: 'hidden',
          background: '#e5e7eb',
        }}
      />

      <button
        className="map-location-button"
        type="button"
        onClick={handleLocateMe}
        disabled={locating}
        aria-label="Go to my current location"
      >
        {locating ? 'Locating…' : '◎ My location'}
      </button>

      {routeMessage && (
        <p className="map-feedback" role="status">
          {routeMessage}
        </p>
      )}

      {locationMessage && (
        <p className="map-feedback map-feedback-error" role="status">
          {locationMessage}
        </p>
      )}
    </div>
  )
}
