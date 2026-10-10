import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  Region,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';

import {
  acceptRide as acceptRideApi,
  cancelRiderRide,
  getRideById,
  updateRiderRide,
  type RequestedRide,
} from '../config/api';

import {
  acceptRide,
  completeRide,
  rideStatusFromApi,
  setActiveRide,
  type Ride,
} from '../store/riderSlice';

import type {
  AppDispatch,
  RootState,
} from '../store/store';

import { activeRideStyles as styles } from '../styles/activeRide.styles';

type RootStackParamList = {
  MainTabs: undefined;
  RideRequests: undefined;
  ActiveRide: {
    rideId?: string;
  };
  Settings: undefined;
};

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ActiveRide'
>;

type Coordinate = {
  latitude: number;
  longitude: number;
};

type RouteData = {
  coordinates: Coordinate[];
  distanceKm: number;
  durationMinutes: number;
};

/**
 * Runtime API data can contain numeric coordinates as strings.
 * react-native-maps requires actual JavaScript numbers.
 */
function toCoordinateNumber(
  value: number | string | null | undefined,
): number {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    throw new Error('Missing map coordinate value.');
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error(
      `Invalid map coordinate value: ${String(value)}`,
    );
  }

  return numericValue;
}

function validateCoordinate(
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined,
): Coordinate {
  const numericLatitude = toCoordinateNumber(latitude);
  const numericLongitude = toCoordinateNumber(longitude);

  if (
    numericLatitude < -90 ||
    numericLatitude > 90 ||
    numericLongitude < -180 ||
    numericLongitude > 180
  ) {
    throw new Error('Ride contains invalid location coordinates.');
  }

  return { latitude: numericLatitude, longitude: numericLongitude };
}

function finiteNonNegative(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? numericValue
    : null;
}

function distanceBetweenMeters(
  first: Coordinate,
  second: Coordinate,
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function mapRequestedRide(
  ride: RequestedRide,
): Ride {
  const pickup = validateCoordinate(
    ride.pickupLatitude,
    ride.pickupLongitude,
  );
  const drop = validateCoordinate(
    ride.dropLatitude,
    ride.dropLongitude,
  );

  return {
    id: ride.id,
    customerId: ride.customerId,

    pickup: ride.pickupAddress,
    pickupLatitude: pickup.latitude,
    pickupLongitude: pickup.longitude,

    drop: ride.dropAddress,
    dropLatitude: drop.latitude,
    dropLongitude: drop.longitude,

    amount:
      finiteNonNegative(ride.finalFare ?? ride.estimatedFare),

    distance:
      finiteNonNegative(ride.estimatedDistance),

    time: new Date(
      ride.requestedAt,
    ).toLocaleString(),

    riderCompletedAt: ride.riderCompletedAt,
    customerCompletedAt: ride.customerCompletedAt,
    startOtpRequired: ride.startOtpRequired,
    payment: ride.payment ? {
      status: ride.payment.status,
      amount: finiteNonNegative(ride.payment.amount),
      mode: ride.payment.mode,
    } : null,

    status: rideStatusFromApi(ride.status),
  };
}

async function getRoute(
  start: Coordinate,
  end: Coordinate,
): Promise<RouteData | null> {
  try {
    const safeStart: Coordinate = {
      ...validateCoordinate(start.latitude, start.longitude),
    };

    const safeEnd: Coordinate = {
      ...validateCoordinate(end.latitude, end.longitude),
    };

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${safeStart.longitude},${safeStart.latitude};` +
      `${safeEnd.longitude},${safeEnd.latitude}` +
      '?overview=full&geometries=geojson';

    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const route = data?.routes?.[0];

    if (!route) {
      return null;
    }

    const coordinates =
      route.geometry?.coordinates?.map(
        (point: [number, number]) => ({
          ...validateCoordinate(point[1], point[0]),
        }),
      ) ?? [];

    if (coordinates.length === 0) {
      return null;
    }

    const distanceMeters = Number(route.distance);
    const durationSeconds = Number(route.duration);
    if (
      !Number.isFinite(distanceMeters) ||
      distanceMeters < 0 ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0
    ) {
      return null;
    }

    return {
      coordinates,
      distanceKm: distanceMeters / 1000,
      durationMinutes: durationSeconds / 60,
    };
  } catch {
    return null;
  }
}

export default function ActiveRideScreen({
  navigation,
  route,
}: Props) {
  const dispatch =
    useDispatch<AppDispatch>();

  const activeRide =
    useSelector(
      (state: RootState) =>
        state.rider.activeRide,
    );

  const requestedRides =
    useSelector(
      (state: RootState) =>
        state.rider.requestedRides,
    );

  const requestedRide =
    useMemo(
      () =>
        route.params?.rideId
          ? requestedRides.find(
              (ride) =>
                ride.id ===
                route.params?.rideId,
            ) ?? null
          : null,
      [
        requestedRides,
        route.params?.rideId,
      ],
    );

  const ride =
    activeRide ??
    requestedRide;

  const mapRef =
    useRef<MapView | null>(null);

  const [currentLocation, setCurrentLocation] =
    useState<Coordinate | null>(null);
  const currentLocationRef = useRef<Coordinate | null>(null);
  currentLocationRef.current = currentLocation;

  const [routeData, setRouteData] =
    useState<RouteData | null>(null);

  const [loadingLocation, setLoadingLocation] =
    useState(true);

  const [loadingRoute, setLoadingRoute] =
    useState(false);

  const [accepting, setAccepting] =
    useState(false);

  const [updatingRide, setUpdatingRide] =
    useState(false);
  const [startOtp, setStartOtp] = useState('');

  const [locationError, setLocationError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let subscription:
      Location.LocationSubscription | null =
      null;

    const loadLocation =
      async () => {
        try {
          setLocationError(null);

          const { status } =
            await Location.requestForegroundPermissionsAsync();

          if (!mounted) {
            return;
          }

          if (status !== 'granted') {
            setLocationError(
              'Location permission is required to show your live position.',
            );
            return;
          }

          const location =
            await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });

          if (!mounted) {
            return;
          }

          setCurrentLocation({
            latitude: toCoordinateNumber(location.coords.latitude),
            longitude: toCoordinateNumber(location.coords.longitude),
          });

          const nextSubscription =
            await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                distanceInterval: 10,
                timeInterval: 3000,
              },
              (nextLocation) => {
                if (!mounted) {
                  return;
                }

                setCurrentLocation({
                  latitude: toCoordinateNumber(nextLocation.coords.latitude),
                  longitude: toCoordinateNumber(nextLocation.coords.longitude),
                });
              },
            );

          if (mounted) {
            subscription = nextSubscription;
          } else {
            nextSubscription.remove();
          }
        } catch {
          if (mounted) {
            setLocationError(
              'Unable to get your current location.',
            );
          }
        } finally {
          if (mounted) {
            setLoadingLocation(false);
          }
        }
      };

    void loadLocation();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!activeRide) return;
    let active = true;
    const refreshRide = async () => {
      try {
        const latest = mapRequestedRide(await getRideById(activeRide.id));
        if (!active) return;
        dispatch(setActiveRide(latest));
        if (latest.status === 'COMPLETED') {
          dispatch(completeRide());
          navigation.navigate('MainTabs');
        }
      } catch {
        // Keep the last server-confirmed ride visible while offline.
      }
    };
    void refreshRide();
    const timer = setInterval(() => void refreshRide(), 5000);
    return () => { active = false; clearInterval(timer); };
  }, [activeRide?.id, dispatch, navigation]);

  useEffect(() => {
    if (!currentLocation || !ride) {
      return;
    }

    let cancelled = false;
    let lastRoutedLocation: Coordinate | null = null;
    setRouteData(null);
    setLoadingRoute(true);

    const loadRoute = async () => {
      const location = currentLocationRef.current;
      if (
        !location ||
        (lastRoutedLocation &&
          distanceBetweenMeters(lastRoutedLocation, location) < 50)
      ) {
        return;
      }

      lastRoutedLocation = location;
      setLoadingRoute(true);

      let destination: Coordinate;
      try {
        destination = validateCoordinate(
          ride.status === 'IN_PROGRESS'
            ? ride.dropLatitude
            : ride.pickupLatitude,
          ride.status === 'IN_PROGRESS'
            ? ride.dropLongitude
            : ride.pickupLongitude,
        );
      } catch {
        if (!cancelled) {
          setRouteData(null);
          setLoadingRoute(false);
        }
        return;
      }

      const nextRoute =
        await getRoute(
          location,
          destination,
        );

      if (!cancelled) {
        setRouteData(nextRoute);
        setLoadingRoute(false);
      }
    };

    void loadRoute();
    const interval = setInterval(() => {
      void loadRoute();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    currentLocation !== null,
    ride?.id,
    ride?.status,
  ]);

  const initialRegion =
    useMemo<Region | null>(() => {
      if (currentLocation) {
        return {
          latitude:
            toCoordinateNumber(
              currentLocation.latitude,
            ),
          longitude:
            toCoordinateNumber(
              currentLocation.longitude,
            ),
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        };
      }

      if (ride) {
        try {
          return {
            ...validateCoordinate(
              ride.status === 'IN_PROGRESS'
                ? ride.dropLatitude
                : ride.pickupLatitude,
              ride.status === 'IN_PROGRESS'
                ? ride.dropLongitude
                : ride.pickupLongitude,
            ),
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          };
        } catch {
          return null;
        }
      }

      return null;
    }, [
      currentLocation,
      ride,
    ]);

  const pickupCoordinate =
    useMemo<Coordinate | null>(() => {
      if (!ride) {
        return null;
      }

      try {
        return validateCoordinate(
          ride.pickupLatitude,
          ride.pickupLongitude,
        );
      } catch {
        return null;
      }
    }, [ride]);

  const dropCoordinate =
    useMemo<Coordinate | null>(() => {
      if (!ride) {
        return null;
      }

      try {
        return validateCoordinate(
          ride.dropLatitude,
          ride.dropLongitude,
        );
      } catch {
        return null;
      }
    }, [ride]);

  const handleRecenter = () => {
    if (!currentLocation) {
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude:
          toCoordinateNumber(
            currentLocation.latitude,
          ),
        longitude:
          toCoordinateNumber(
            currentLocation.longitude,
          ),
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      500,
    );
  };

  const handleAccept = async () => {
    if (!ride || accepting) {
      return;
    }

    try {
      setAccepting(true);

      const acceptedRide =
        await acceptRideApi(ride.id);

      const mappedRide =
        mapRequestedRide(
          acceptedRide,
        );

      dispatch(
        acceptRide(mappedRide),
      );

      Alert.alert(
        'Ride Accepted',
        'Navigate to the pickup location.',
      );
    } catch (error) {
      Alert.alert(
        'Unable to Accept Ride',
        error instanceof Error
          ? error.message
          : 'Something went wrong while accepting the ride.',
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleArriving = async () => {
    if (!ride || updatingRide) return;

    try {
      setUpdatingRide(true);
      const updated = await updateRiderRide(ride.id, 'arrive');
      dispatch(setActiveRide(mapRequestedRide(updated)));
    } catch (error) {
      Alert.alert(
        'Unable to update ride',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setUpdatingRide(false);
    }
  };

  const handleStart = async () => {
    const otpRequired = ride?.startOtpRequired !== false;
    if (!ride || updatingRide || (otpRequired && !/^\d{6}$/.test(startOtp))) return;
    try {
      setUpdatingRide(true);
      const updated = await updateRiderRide(
        ride.id,
        'start',
        otpRequired ? { otp: startOtp } : undefined,
      );
      dispatch(setActiveRide(mapRequestedRide(updated)));
      setStartOtp('');
    } catch (error) {
      Alert.alert('Unable to start ride', error instanceof Error ? error.message : 'Please check the customer code.');
    } finally {
      setUpdatingRide(false);
    }
  };

  const handleComplete = async () => {
    if (!ride || updatingRide) return;

    try {
      setUpdatingRide(true);
      const completedRide = await updateRiderRide(ride.id, 'complete');
      const mappedRide = mapRequestedRide(completedRide);
      dispatch(setActiveRide(mappedRide));
      if (mappedRide.status === 'COMPLETED') {
        dispatch(completeRide());
        navigation.navigate('MainTabs');
      }
    } catch (error) {
      Alert.alert(
        'Unable to complete ride',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setUpdatingRide(false);
    }
  };

  const handleCancel = () => {
    if (!ride || updatingRide) return;

    Alert.alert('Cancel ride?', 'This will cancel the ride on the server.', [
      { text: 'Keep ride', style: 'cancel' },
      {
        text: 'Cancel ride',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setUpdatingRide(true);
              await cancelRiderRide(ride.id);
              dispatch(setActiveRide(null));
              navigation.navigate('MainTabs');
            } catch (error) {
              Alert.alert(
                'Unable to cancel ride',
                error instanceof Error ? error.message : 'Please try again.',
              );
            } finally {
              setUpdatingRide(false);
            }
          })();
        },
      },
    ]);
  };

  if (!ride) {
    return (
      <View
        style={styles.emptyContainer}
      >
        <Text
          style={styles.emptyTitle}
        >
          Ride no longer available
        </Text>

        <Text
          style={styles.emptyText}
        >
          This ride may have already been
          accepted or cancelled.
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={styles.backButtonText}
          >
            Back to Requests
          </Text>
        </Pressable>
      </View>
    );
  }

  const isAccepted =
    activeRide?.id === ride.id;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {initialRegion ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={
              initialRegion
            }
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass
            rotateEnabled
            zoomEnabled
          >
            {currentLocation && (
              <Marker
                coordinate={{
                  latitude:
                    toCoordinateNumber(
                      currentLocation.latitude,
                    ),
                  longitude:
                    toCoordinateNumber(
                      currentLocation.longitude,
                    ),
                }}
                title="You"
                description="Current rider location"
              >
                <View
                  style={
                    styles.riderMarker
                  }
                >
                  <View
                    style={
                      styles.riderMarkerInner
                    }
                  />
                </View>
              </Marker>
            )}

            {pickupCoordinate && (
              <Marker
                coordinate={
                  pickupCoordinate
                }
                title="Pickup"
                description={
                  ride.pickup
                }
              >
                <View
                  style={
                    styles.pickupMarker
                  }
                >
                  <Text
                    style={
                      styles.markerText
                    }
                  >
                    P
                  </Text>
                </View>
              </Marker>
            )}

            {dropCoordinate && (
              <Marker
                coordinate={
                  dropCoordinate
                }
                title="Destination"
                description={
                  ride.drop
                }
              >
                <View
                  style={
                    styles.dropMarker
                  }
                >
                  <Text
                    style={
                      styles.markerText
                    }
                  >
                    D
                  </Text>
                </View>
              </Marker>
            )}

            {routeData && (
              <Polyline
                coordinates={
                  routeData.coordinates
                }
                strokeWidth={5}
                strokeColor="#111111"
              />
            )}
          </MapView>
        ) : (
          <View
            style={styles.mapLoading}
          >
            <ActivityIndicator
              size="large"
            />

            <Text
              style={
                styles.mapLoadingText
              }
            >
              {loadingLocation
                ? 'Getting your location...'
                : 'Map unavailable'}
            </Text>
          </View>
        )}

        <Pressable
          style={styles.recenterButton}
          onPress={
            handleRecenter
          }
        >
          <Text
            style={
              styles.recenterText
            }
          >
            ◎
          </Text>
        </Pressable>

        <Pressable
          style={styles.closeButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={styles.closeText}
          >
            ‹
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.bottomSheet}
        contentContainerStyle={styles.bottomSheetContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={styles.handle}
        />

        <View
          style={styles.headerRow}
        >
          <View>
            <Text
              style={styles.screenTitle}
            >
              {isAccepted
                ? 'Heading to Pickup'
                : 'Ride Request'}
            </Text>

            <Text
              style={styles.statusText}
            >
              {ride.status.replaceAll('_', ' ')}
            </Text>
          </View>

          {ride.amount !== null && (
            <Text
              style={styles.fare}
            >
              ₹{ride.amount.toFixed(2)}
            </Text>
          )}
        </View>

        {locationError && (
          <View
            style={styles.warningCard}
          >
            <Text
              style={styles.warningText}
            >
              {locationError}
            </Text>
          </View>
        )}

        {(!pickupCoordinate || !dropCoordinate) && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              Ride location coordinates are missing or invalid. The affected map marker cannot be shown.
            </Text>
          </View>
        )}

        <View
          style={styles.locationCard}
        >
          <View
            style={styles.locationRow}
          >
            <View
              style={styles.dotPickup}
            />

            <View
              style={styles.locationContent}
            >
              <Text
                style={styles.locationLabel}
              >
                PICKUP
              </Text>

              <Text
                style={styles.locationText}
                numberOfLines={2}
              >
                {ride.pickup}
              </Text>
            </View>
          </View>

          <View
            style={styles.connector}
          />

          <View
            style={styles.locationRow}
          >
            <View
              style={styles.dotDrop}
            />

            <View
              style={styles.locationContent}
            >
              <Text
                style={styles.locationLabel}
              >
                DESTINATION
              </Text>

              <Text
                style={styles.locationText}
                numberOfLines={2}
              >
                {ride.drop}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={styles.statsRow}
        >
          <View style={styles.stat}>
            <Text
              style={styles.statLabel}
            >
              {ride.status === 'IN_PROGRESS' ? 'TO DESTINATION' : 'TO PICKUP'}
            </Text>

            <Text
              style={styles.statValue}
            >
              {loadingRoute
                ? '...'
                : routeData
                  ? `${routeData.distanceKm.toFixed(
                      1,
                    )} km`
                  : '—'}
            </Text>
          </View>

          <View
            style={styles.statDivider}
          />

          <View style={styles.stat}>
            <Text
              style={styles.statLabel}
            >
              ETA
            </Text>

            <Text
              style={styles.statValue}
            >
              {loadingRoute
                ? '...'
                : routeData
                  ? `${Math.max(
                      1,
                      Math.round(
                        routeData.durationMinutes,
                      ),
                    )} min`
                  : '—'}
            </Text>
          </View>

          <View
            style={styles.statDivider}
          />

          <View style={styles.stat}>
            <Text
              style={styles.statLabel}
            >
              TRIP
            </Text>

            <Text
              style={styles.statValue}
            >
              {ride.distance !== null
                ? `${ride.distance.toFixed(
                    1,
                  )} km`
                : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.arrivingCard}>
          <Text style={styles.arrivingText}>
            Ride fare: {ride.amount === null ? 'Not available' : `₹${ride.amount.toFixed(2)}`}
          </Text>
          <Text style={styles.arrivingText}>
            Payment: {ride.payment?.status ?? 'UNPAID'}
            {ride.payment?.amount != null ? ` · ₹${ride.payment.amount.toFixed(2)}` : ''}
          </Text>
        </View>

        {!isAccepted && (
          <Pressable
            style={[
              styles.acceptButton,
              accepting &&
                styles.disabledButton,
            ]}
            disabled={accepting}
            onPress={
              handleAccept
            }
          >
            {accepting ? (
              <ActivityIndicator
                color="#ffffff"
              />
            ) : (
              <Text
                style={
                  styles.acceptButtonText
                }
              >
                ACCEPT RIDE
              </Text>
            )}
          </Pressable>
        )}

        {isAccepted && ride.status === 'ASSIGNED' && (
          <View
            style={styles.arrivingCard}
          >
            <View
              style={
                styles.arrivingIndicator
              }
            />

            <Text
              style={
                styles.arrivingText
              }
            >
              Navigate to the pickup location. Mark the ride as arriving when you are on the way.
            </Text>
          </View>
        )}

        {isAccepted && ride.status === 'ASSIGNED' && (
          <Pressable
            style={[styles.acceptButton, updatingRide && styles.disabledButton]}
            disabled={updatingRide}
            onPress={handleArriving}
            accessibilityRole="button"
          >
            {updatingRide ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.acceptButtonText}>MARK AS ARRIVING</Text>
            )}
          </Pressable>
        )}

        {isAccepted && ride.status === 'DRIVER_ARRIVING' && (
          <View>
            {ride.startOtpRequired !== false ? (
              <>
                <View style={styles.arrivingCard}>
                  <Text style={styles.arrivingText}>Enter the six-digit code provided by the customer to start the ride.</Text>
                </View>
                <TextInput
                  style={styles.otpInput}
                  value={startOtp}
                  onChangeText={(value) => setStartOtp(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  placeholder="Ride start code"
                  accessibilityLabel="Ride start code"
                />
              </>
            ) : (
              <View style={styles.arrivingCard}>
                <Text style={styles.arrivingText}>OTP verification is disabled for this ride.</Text>
              </View>
            )}
            <Pressable
              style={[styles.acceptButton, updatingRide && styles.disabledButton]}
              disabled={updatingRide || (ride.startOtpRequired !== false && startOtp.length !== 6)}
              onPress={handleStart}
              accessibilityRole="button"
            >
              {updatingRide ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.acceptButtonText}>START RIDE</Text>
              )}
            </Pressable>
          </View>
        )}

        {isAccepted && ride.status === 'IN_PROGRESS' && !ride.riderCompletedAt && (
          <Pressable
            style={[styles.acceptButton, updatingRide && styles.disabledButton]}
            disabled={updatingRide}
            onPress={handleComplete}
            accessibilityRole="button"
          >
            {updatingRide ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.acceptButtonText}>COMPLETE RIDE</Text>
            )}
          </Pressable>
        )}

        {isAccepted && ride.status === 'IN_PROGRESS' && ride.riderCompletedAt && (
          <View style={styles.arrivingCard}>
            <Text style={styles.arrivingText}>
              Your completion is recorded. Waiting for the customer to confirm.
            </Text>
          </View>
        )}

        {isAccepted && ['ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS'].includes(ride.status) && (
          <Pressable
            style={styles.cancelButton}
            disabled={updatingRide}
            onPress={handleCancel}
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>CANCEL RIDE</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
