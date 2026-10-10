import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapLocation {
  latitude: number
  longitude: number
}

interface MapViewProps {
  pickup?: MapLocation
  drop?: MapLocation
}

const markerIcon = L.divIcon({
  className: 'urbanride-map-marker',
  html: `
    <div
      style="
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: #2563eb;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      "
    ></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
})

export function MapView({
  pickup,
  drop,
}: MapViewProps) {
  const mapContainerRef =
    useRef<HTMLDivElement | null>(null)

  const mapRef =
    useRef<L.Map | null>(null)

  const markersLayerRef =
    useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    const container =
      mapContainerRef.current

    if (!container || mapRef.current) {
      return
    }

    const initialLocation = pickup ?? {
      latitude: 12.9716,
      longitude: 77.5946,
    }

    const map = L.map(container).setView(
      [
        initialLocation.latitude,
        initialLocation.longitude,
      ],
      13,
    )

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; OpenStreetMap contributors',
      },
    ).addTo(map)

    const markersLayer =
      L.layerGroup().addTo(map)

    mapRef.current = map
    markersLayerRef.current =
      markersLayer

    requestAnimationFrame(() => {
      map.invalidateSize()
    })

    return () => {
      markersLayer.clearLayers()
      markersLayer.remove()

      map.remove()

      markersLayerRef.current = null
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const markersLayer =
      markersLayerRef.current

    if (!map || !markersLayer) {
      return
    }

    markersLayer.clearLayers()

    const locations: [
      number,
      number,
    ][] = []

    if (pickup) {
      const pickupLocation: [
        number,
        number,
      ] = [
        pickup.latitude,
        pickup.longitude,
      ]

      L.marker(pickupLocation, {
        icon: markerIcon,
      })
        .addTo(markersLayer)
        .bindPopup('Pickup')

      locations.push(pickupLocation)
    }

    if (drop) {
      const dropLocation: [
        number,
        number,
      ] = [
        drop.latitude,
        drop.longitude,
      ]

      L.marker(dropLocation, {
        icon: markerIcon,
      })
        .addTo(markersLayer)
        .bindPopup('Drop')

      locations.push(dropLocation)
    }

    if (locations.length === 2) {
      L.polyline(locations).addTo(
        markersLayer,
      )

      map.fitBounds(
        L.latLngBounds(locations),
        {
          padding: [30, 30],
        },
      )
    } else if (locations.length === 1) {
      map.setView(locations[0], 14)
    }
  }, [pickup, drop])

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '400px',
      }}
    />
  )
}