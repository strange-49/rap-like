import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useSelector } from 'react-redux';

import { reportRiderLocation } from '../config/api';
import type { RootState } from '../store/store';

const IDLE_REPORT_INTERVAL_MS = 20_000;

/**
 * Renders nothing. While the rider is ONLINE and the app is in the foreground
 * it reports the rider's position every ~20 s so the server can target ride
 * requests at nearby riders instead of everyone. It never asks for the
 * permission itself (the Active Ride screen does that); no permission simply
 * means no reporting.
 *
 * Battery: balanced accuracy, 20 s cadence, and it stops when the rider goes
 * offline or the app goes to the background.
 */
export default function RiderLocationReporter() {
  const isOnline = useSelector((state: RootState) => state.rider.isOnline);
  const activeRide = useSelector((state: RootState) => state.rider.activeRide);

  useEffect(() => {
    if (!isOnline || activeRide) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function reportOnce() {
      if (cancelled || AppState.currentState !== 'active') {
        return;
      }

      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) {
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) {
          return;
        }

        await reportRiderLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading ?? null,
          speedKmh:
            position.coords.speed !== null && position.coords.speed >= 0
              ? position.coords.speed * 3.6
              : null,
        });
      } catch {
        // Best effort: try again on the next tick.
      }
    }

    void reportOnce();
    timer = setInterval(() => void reportOnce(), IDLE_REPORT_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [activeRide, isOnline]);

  return null;
}
