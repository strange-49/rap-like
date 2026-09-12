import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapLocation {
  latitude: number;
  longitude: number;
}

interface MapViewProps {
  pickup?: MapLocation;
  drop?: MapLocation;
}

export function MapView({
  pickup,
  drop,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const initialLocation = pickup ?? {
      latitude: 12.9716,
      longitude: 77.5946,
    };

    const map = L.map(mapContainerRef.current).setView(
      [initialLocation.latitude, initialLocation.longitude],
      13,
    );

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; OpenStreetMap contributors',
      },
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [pickup]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const locations: [number, number][] = [];

    if (pickup) {
      const pickupLocation: [number, number] = [
        pickup.latitude,
        pickup.longitude,
      ];

      L.marker(pickupLocation)
        .addTo(map)
        .bindPopup('Pickup');

      locations.push(pickupLocation);
    }

    if (drop) {
      const dropLocation: [number, number] = [
        drop.latitude,
        drop.longitude,
      ];

      L.marker(dropLocation)
        .addTo(map)
        .bindPopup('Drop');

      locations.push(dropLocation);
    }

    if (locations.length === 2) {
      L.polyline(locations).addTo(map);

      map.fitBounds(
        L.latLngBounds(locations),
        { padding: [30, 30] },
      );
    } else if (locations.length === 1) {
      map.setView(locations[0], 14);
    }
  }, [pickup, drop]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '400px',
      }}
    />
  );
}