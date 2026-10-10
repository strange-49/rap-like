import {
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  Provider,
  useDispatch,
} from 'react-redux';

import * as Notifications from 'expo-notifications';

import AppNavigator, {
  navigationRef,
} from './src/navigation/AppNavigator';

import {
  getRiderSession,
  subscribeToRiderSession,
} from './src/config/auth';

import {
  acceptRide as acceptRideApi,
  type RequestedRide,
} from './src/config/api';

import {
  registerRiderPushToken,
  parseRideRequestNotification,
  type RideRequestNotificationData,
} from './src/notifications/notifications';

import {
  acceptRide as acceptRideAction,
  rideStatusFromApi,
  type Ride,
} from './src/store/riderSlice';

import {
  store,
  type AppDispatch,
} from './src/store/store';

import {
  notificationStyles as styles,
} from './src/styles/notification.styles';

function finiteNonNegative(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? numericValue
    : null;
}

function mapRequestedRide(
  ride: RequestedRide,
): Ride {
  return {
    id: ride.id,
    customerId: ride.customerId,

    pickup: ride.pickupAddress,
    pickupLatitude: ride.pickupLatitude,
    pickupLongitude: ride.pickupLongitude,

    drop: ride.dropAddress,
    dropLatitude: ride.dropLatitude,
    dropLongitude: ride.dropLongitude,

    amount: finiteNonNegative(ride.estimatedFare),

    distance: finiteNonNegative(ride.estimatedDistance),

    time: new Date(
      ride.requestedAt,
    ).toLocaleString(),

    status: rideStatusFromApi(ride.status),
  };
}

function RideRequestOverlay({
  request,
  onClose,
}: {
  request: RideRequestNotificationData;
  onClose: () => void;
}) {
  const dispatch =
    useDispatch<AppDispatch>();

  const [accepting, setAccepting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleAccept() {
    if (accepting) {
      return;
    }

    try {
      setAccepting(true);
      setError(null);

      /*
       * Fetch the complete ride from the backend.
       *
       * The push notification only contains
       * display information. The API response
       * contains the coordinates required by
       * the Active Ride map.
       */
      const acceptedRide =
        await acceptRideApi(
          request.rideId,
        );

      const mappedRide =
        mapRequestedRide(
          acceptedRide,
        );

      /*
       * Store the accepted ride globally.
       */
      dispatch(
        acceptRideAction(
          mappedRide,
        ),
      );

      onClose();

      /*
       * Open the Active Ride map immediately
       * after successful acceptance.
       */
      if (
        navigationRef.isReady()
      ) {
        navigationRef.navigate(
          'ActiveRide',
          {
            rideId:
              mappedRide.id,
          },
        );
      }

      Alert.alert(
        'Ride Accepted',
        'Navigate to the pickup location.',
      );
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : 'Unable to accept this ride.',
      );
    } finally {
      setAccepting(false);
    }
  }

  function handleReject() {
    /*
     * Reject currently only dismisses the
     * notification. We intentionally do NOT
     * call the customer cancellation endpoint.
     */
    onClose();
  }

  return (
    <View
      style={styles.overlay}
      pointerEvents="box-none"
    >
      <View
        style={styles.backdrop}
      />

      <View
        style={styles.requestPanel}
      >
        <View
          style={styles.requestHeader}
        >
          <View>
            <Text
              style={styles.requestLabel}
            >
              NEW RIDE REQUEST
            </Text>

            <Text
              style={styles.requestTitle}
            >
              New ride available
            </Text>
          </View>

          <View
            style={styles.newBadge}
          >
            <Text
              style={styles.newBadgeText}
            >
              NEW
            </Text>
          </View>
        </View>

        <View
          style={styles.fareCard}
        >
          <View>
            <Text
              style={styles.fareLabel}
            >
              ESTIMATED FARE
            </Text>

            <Text
              style={styles.fare}
            >
              ₹
              {request.estimatedFare
                ? Number(
                    request.estimatedFare,
                  ).toFixed(2)
                : '—'}
            </Text>
          </View>

          <View
            style={
              styles.rideTypeContainer
            }
          >
            <Text
              style={styles.rideTypeLabel}
            >
              RIDE TYPE
            </Text>

            <Text
              style={styles.rideType}
            >
              {request.rideType
                ? request.rideType
                    .charAt(0)
                    .toUpperCase() +
                  request.rideType.slice(1)
                : 'Ride'}
            </Text>
          </View>
        </View>

        <View
          style={styles.routeCard}
        >
          <View
            style={styles.routeRow}
          >
            <View
              style={[
                styles.routeDot,
                styles.pickupDot,
              ]}
            />

            <View
              style={
                styles.routeTextContainer
              }
            >
              <Text
                style={styles.routeLabel}
              >
                PICKUP
              </Text>

              <Text
                style={
                  styles.routeAddress
                }
              >
                {request.pickupAddress ||
                  'Pickup location'}
              </Text>
            </View>
          </View>

          <View
            style={styles.routeLine}
          />

          <View
            style={styles.routeRow}
          >
            <View
              style={[
                styles.routeDot,
                styles.dropDot,
              ]}
            />

            <View
              style={
                styles.routeTextContainer
              }
            >
              <Text
                style={styles.routeLabel}
              >
                DESTINATION
              </Text>

              <Text
                style={
                  styles.routeAddress
                }
              >
                {request.dropAddress ||
                  'Destination'}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={styles.distanceCard}
        >
          <Text
            style={styles.distanceLabel}
          >
            DISTANCE
          </Text>

          <Text
            style={styles.distanceValue}
          >
            {request.estimatedDistance
              ? `${Number(
                  request.estimatedDistance,
                ).toFixed(2)} km`
              : '—'}
          </Text>
        </View>

        {error && (
          <View
            style={styles.errorCard}
          >
            <Text
              style={styles.errorText}
            >
              {error}
            </Text>
          </View>
        )}

        <View
          style={styles.actionRow}
        >
          <Pressable
            style={[
              styles.rejectButton,
              accepting &&
                styles.disabledButton,
            ]}
            onPress={
              handleReject
            }
            disabled={accepting}
          >
            <Text
              style={styles.rejectText}
            >
              REJECT
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.acceptButton,
              accepting &&
                styles.disabledButton,
            ]}
            onPress={() =>
              void handleAccept()
            }
            disabled={accepting}
          >
            <Text
              style={styles.acceptText}
            >
              {accepting
                ? 'ACCEPTING...'
                : 'ACCEPT'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] =
    useState(
      Boolean(getRiderSession()),
    );

  const [
    rideRequest,
    setRideRequest,
  ] =
    useState<RideRequestNotificationData | null>(
      null,
    );

  useEffect(() =>
    subscribeToRiderSession(() => {
      setAuthenticated(Boolean(getRiderSession()));
    }),
  [],);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    registerRiderPushToken()
      .then(() => undefined)
      .catch((error) => {
        console.error(
          'Failed to register rider push token.',
          error,
        );
      });
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const receivedSubscription =
      Notifications.addNotificationReceivedListener(
        (notification) => {
          const data =
            notification.request.content
              .data as Record<
              string,
              unknown
            >;

          const request =
            parseRideRequestNotification(
              data,
            );

          if (request) {
            setRideRequest(request);
          }
        },
      );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data =
            response.notification.request
              .content
              .data as Record<
              string,
              unknown
            >;

          const request =
            parseRideRequestNotification(
              data,
            );

          if (request) {
            setRideRequest(request);
          }
        },
      );

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) {
          return;
        }

        const data =
          response.notification.request
            .content
            .data as Record<
            string,
            unknown
          >;

        const request =
          parseRideRequestNotification(
            data,
          );

        if (request) {
          setRideRequest(request);
        }
      })
      .catch((error) => {
        console.error(
          'Failed to read last notification response.',
          error,
        );
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [authenticated]);

  function handleLoginSuccess() {
    setAuthenticated(true);
  }

  return (
    <Provider store={store}>
      <View style={{ flex: 1 }}>
        <AppNavigator
          authenticated={
            authenticated
          }
          onLoginSuccess={
            handleLoginSuccess
          }
        />

        {rideRequest && (
          <RideRequestOverlay
            request={rideRequest}
            onClose={() =>
              setRideRequest(null)
            }
          />
        )}
      </View>
    </Provider>
  );
}
