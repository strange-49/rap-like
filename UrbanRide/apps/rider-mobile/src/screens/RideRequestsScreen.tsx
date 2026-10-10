import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useDispatch,
  useSelector,
} from 'react-redux';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  getRequestedRides,
  type RequestedRide,
} from '../config/api';
import {
  setRequestedRides,
  rideStatusFromApi,
  type Ride,
} from '../store/riderSlice';
import type {
  AppDispatch,
  RootState,
} from '../store/store';

type RootStackParamList = {
  MainTabs: undefined;
  RideRequests: undefined;
  ActiveRide: {
    rideId: string;
  };
};

type Props = NativeStackScreenProps<
  RootStackParamList,
  'RideRequests'
>;

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
    startOtpRequired: ride.startOtpRequired,
  };
}

export default function RideRequestsScreen({
  navigation,
}: Props) {
  const dispatch =
    useDispatch<AppDispatch>();

  const requestedRides =
    useSelector(
      (state: RootState) =>
        state.rider.requestedRides,
    );

  const isOnline =
    useSelector(
      (state: RootState) =>
        state.rider.isOnline,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadRequests =
    useCallback(
      async (
        showRefresh = false,
      ) => {
        try {
          if (showRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError(null);

          const rides =
            await getRequestedRides();

          const sortedRides =
            [...rides].sort(
              (a, b) =>
                new Date(
                  b.requestedAt,
                ).getTime() -
                new Date(
                  a.requestedAt,
                ).getTime(),
            );

          dispatch(
            setRequestedRides(
              sortedRides.map(
                mapRequestedRide,
              ),
            ),
          );
        } catch (requestError) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load ride requests.',
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [dispatch],
    );

  useEffect(() => {
    void loadRequests();

    const interval =
      setInterval(() => {
        void loadRequests();
      }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [loadRequests]);

  const handleRefresh = () => {
    void loadRequests(true);
  };

  const handleSelectRide = (
    rideId: string,
  ) => {
    navigation.navigate(
      'ActiveRide',
      {
        rideId,
      },
    );
  };

  if (!isOnline) {
    return (
      <View
        style={
          styles.centeredContainer
        }
      >
        <Text style={styles.title}>
          Ride Requests
        </Text>

        <Text
          style={styles.emptyTitle}
        >
          You are offline
        </Text>

        <Text
          style={styles.emptyText}
        >
          Go online from the Home screen
          to receive ride requests.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Ride Requests
      </Text>

      {loading && (
        <Text
          style={styles.infoText}
        >
          Loading ride requests...
        </Text>
      )}

      {error && (
        <View
          style={styles.errorCard}
        >
          <Text
            style={styles.errorText}
          >
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() =>
              void loadRequests()
            }
          >
            <Text
              style={styles.retryText}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      )}

      {!loading &&
        !error &&
        requestedRides.length === 0 && (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={styles.emptyTitle}
            >
              No ride requests
            </Text>

            <Text
              style={styles.emptyText}
            >
              New ride requests will
              appear here automatically.
            </Text>
          </View>
        )}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={
          requestedRides.length === 0
            ? styles.emptyContent
            : styles.listContent
        }
      >
        {requestedRides.map(
          (ride) => (
            <View
              key={ride.id}
              style={styles.requestCard}
            >
              <Text
                style={styles.status}
              >
                {ride.status.replace('_', ' ')}
              </Text>

              <View
                style={
                  styles.locationBlock
                }
              >
                <Text
                  style={styles.label}
                >
                  Pickup
                </Text>

                <Text
                  style={styles.location}
                >
                  {ride.pickup}
                </Text>
              </View>

              <View
                style={
                  styles.locationBlock
                }
              >
                <Text
                  style={styles.label}
                >
                  Drop
                </Text>

                <Text
                  style={styles.location}
                >
                  {ride.drop}
                </Text>
              </View>

              <View
                style={styles.detailsRow}
              >
                <View>
                  <Text
                    style={styles.label}
                  >
                    Distance
                  </Text>

                  <Text
                    style={styles.value}
                  >
                    {ride.distance !==
                    null
                      ? `${ride.distance.toFixed(
                          2,
                        )} km`
                      : 'N/A'}
                  </Text>
                </View>

                <View>
                  <Text
                    style={styles.label}
                  >
                    Estimated Fare
                  </Text>

                  <Text
                    style={styles.value}
                  >
                    {ride.amount !== null
                      ? `₹${ride.amount.toFixed(
                          2,
                        )}`
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.requestedAt
                }
              >
                Requested: {ride.time}
              </Text>

              <Pressable
                style={
                  styles.viewButton
                }
                onPress={() =>
                  handleSelectRide(
                    ride.id,
                  )
                }
              >
                <Text
                  style={
                    styles.viewButtonText
                  }
                >
                  View Request
                </Text>
              </Pressable>
            </View>
          ),
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
  },

  centeredContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 24,
  },

  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },

  status: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 20,
  },

  locationBlock: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },

  label: {
    fontSize: 13,
    marginBottom: 5,
  },

  location: {
    fontSize: 17,
    fontWeight: '600',
  },

  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 18,
  },

  value: {
    fontSize: 17,
    fontWeight: '700',
  },

  requestedAt: {
    fontSize: 12,
    marginTop: 18,
  },

  viewButton: {
    marginTop: 18,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#111111',
  },

  viewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  infoText: {
    fontSize: 15,
    marginBottom: 16,
  },

  emptyContent: {
    flexGrow: 1,
  },

  listContent: {
    paddingBottom: 24,
  },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    marginTop: 8,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 15,
    lineHeight: 22,
  },

  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },

  errorText: {
    fontSize: 15,
    marginBottom: 16,
  },

  retryButton: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#111111',
  },

  retryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
