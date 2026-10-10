import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  Alert,
} from 'react-native';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { setActiveRide, setRideHistory, toggleOnline, rideStatusFromApi, type Ride } from '../store/riderSlice';
import { getActiveRiderRide, getRiderRideHistory } from '../config/api';
import type {
  AppDispatch,
  RootState,
} from '../store/store';

import { commonStyles } from '../styles/common';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';
import { typography } from '../styles/typography';
import { StyleSheet } from 'react-native';

type RootStackParamList = {
  MainTabs: undefined;
  RideRequests: undefined;
  Completed: undefined;
  Earnings: undefined;
  ActiveRide: {
    rideId?: string;
  };
};

type Props = NativeStackScreenProps<
  RootStackParamList
>;

export default function HomeScreen({
  navigation,
}: Props) {
  const dispatch =
    useDispatch<AppDispatch>();

  const isOnline =
    useSelector(
      (state: RootState) =>
        state.rider.isOnline,
    );

  const activeRide =
    useSelector(
      (state: RootState) =>
        state.rider.activeRide,
    );

  const rideHistory =
    useSelector(
      (state: RootState) =>
        state.rider.rideHistory,
    );

  const requestedRides =
    useSelector(
      (state: RootState) =>
        state.rider.requestedRides,
    );

  useEffect(() => {
    let mounted = true;
    void getActiveRiderRide().then((ride) => {
      if (!mounted || !ride) return;
      const fare = ride.finalFare ?? ride.estimatedFare;
      const amount = fare == null ? null : Number(fare);
      const distance = ride.estimatedDistance == null ? null : Number(ride.estimatedDistance);
      const restored: Ride = {
        id: ride.id,
        customerId: ride.customerId,
        pickup: ride.pickupAddress,
        pickupLatitude: Number(ride.pickupLatitude),
        pickupLongitude: Number(ride.pickupLongitude),
        drop: ride.dropAddress,
        dropLatitude: Number(ride.dropLatitude),
        dropLongitude: Number(ride.dropLongitude),
        amount: amount !== null && Number.isFinite(amount) ? amount : null,
        distance: distance !== null && Number.isFinite(distance) ? distance : null,
        time: new Date(ride.requestedAt).toLocaleString(),
        status: rideStatusFromApi(ride.status),
        riderCompletedAt: ride.riderCompletedAt,
        customerCompletedAt: ride.customerCompletedAt,
        startOtpRequired: ride.startOtpRequired,
        payment: ride.payment ? {
          status: ride.payment.status,
          amount: Number.isFinite(Number(ride.payment.amount)) ? Number(ride.payment.amount) : null,
          mode: ride.payment.mode,
        } : null,
      };
      dispatch(setActiveRide(restored));
    }).catch((error) => {
      if (mounted) Alert.alert('Current ride unavailable', error instanceof Error ? error.message : 'Unable to restore current ride.');
    });
    return () => { mounted = false; };
  }, [dispatch]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void getRiderRideHistory().then((rides) => {
      if (!active) return;
      dispatch(setRideHistory(rides.filter((ride) => ride.status === 'COMPLETED').map((ride) => {
        const fare = ride.finalFare ?? ride.estimatedFare;
        const amount = fare == null ? null : Number(fare);
        return {
          id: ride.id,
          customerId: ride.customerId,
          pickup: ride.pickupAddress,
          pickupLatitude: Number(ride.pickupLatitude),
          pickupLongitude: Number(ride.pickupLongitude),
          drop: ride.dropAddress,
          dropLatitude: Number(ride.dropLatitude),
          dropLongitude: Number(ride.dropLongitude),
          amount: amount !== null && Number.isFinite(amount) ? amount : null,
          distance: ride.estimatedDistance == null ? null : Number(ride.estimatedDistance),
          time: new Date(ride.requestedAt).toLocaleString(),
          status: rideStatusFromApi(ride.status),
          riderCompletedAt: ride.riderCompletedAt,
          customerCompletedAt: ride.customerCompletedAt,
          payment: ride.payment ? {
            status: ride.payment.status,
            amount: Number.isFinite(Number(ride.payment.amount)) ? Number(ride.payment.amount) : null,
            mode: ride.payment.mode,
          } : null,
        };
      })));
    }).catch((error) => {
      if (active) Alert.alert('Ride summary unavailable', error instanceof Error ? error.message : 'Unable to load ride summary.');
    });
    return () => { active = false; };
  }, [dispatch]));

  const totalEarnings = rideHistory.reduce(
    (total, ride) => total + (ride.payment?.status === 'CAPTURED' ? ride.payment.amount ?? 0 : 0),
    0,
  );

  const handleActiveRide = () => {
    if (!activeRide) {
      return;
    }

    navigation.navigate(
      'ActiveRide',
      {
        rideId: activeRide.id,
      },
    );
  };

  const handleRideRequests = () => {
    navigation.navigate(
      'RideRequests',
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={styles.header}
      >
        <View>
          <Text
            style={styles.greeting}
          >
            Welcome back
          </Text>

          <Text
            style={styles.title}
          >
            UrbanRide Rider
          </Text>
        </View>

        <View
          style={[
            styles.onlineDot,
            isOnline &&
              styles.onlineDotActive,
          ]}
        />
      </View>

      <View
        style={styles.statusCard}
      >
        <View>
          <Text
            style={styles.statusLabel}
          >
            RIDER STATUS
          </Text>

          <Text
            style={styles.statusValue}
          >
            {isOnline
              ? 'You are Online'
              : 'You are Offline'}
          </Text>

          <Text
            style={styles.statusDescription}
          >
            {isOnline
              ? 'You can receive new ride requests.'
              : 'Go online when you are ready to ride.'}
          </Text>
        </View>

        <Pressable
          style={[
            styles.onlineButton,
            isOnline &&
              styles.offlineButton,
          ]}
          onPress={() =>
            dispatch(toggleOnline())
          }
        >
          <Text
            style={
              styles.onlineButtonText
            }
          >
            {isOnline
              ? 'GO OFFLINE'
              : 'GO ONLINE'}
          </Text>
        </Pressable>
      </View>

      {activeRide && (
        <Pressable
          style={styles.activeCard}
          onPress={
            handleActiveRide
          }
        >
          <View
            style={styles.activeHeader}
          >
            <View>
              <Text
                style={
                  styles.activeLabel
                }
              >
                ACTIVE RIDE
              </Text>

              <Text
                style={
                  styles.activeStatus
                }
              >
                {activeRide.status.replace(
                  '_',
                  ' ',
                )}
              </Text>
            </View>

            <Text
              style={styles.activeFare}
            >
              {activeRide.amount !==
              null
                ? `₹${activeRide.amount.toFixed(
                    2,
                  )}`
                : '—'}
            </Text>
          </View>

          <View
            style={styles.routeRow}
          >
            <View
              style={
                styles.routeIndicator
              }
            >
              <View
                style={styles.pickupDot}
              />

              <View
                style={styles.routeLine}
              />

              <View
                style={styles.dropDot}
              />
            </View>

            <View
              style={styles.routeText}
            >
              <Text
                style={
                  styles.locationLabel
                }
              >
                PICKUP
              </Text>

              <Text
                style={
                  styles.locationValue
                }
                numberOfLines={1}
              >
                {activeRide.pickup}
              </Text>

              <View
                style={styles.routeGap}
              />

              <Text
                style={
                  styles.locationLabel
                }
              >
                DESTINATION
              </Text>

              <Text
                style={
                  styles.locationValue
                }
                numberOfLines={1}
              >
                {activeRide.drop}
              </Text>
            </View>
          </View>

          <Text
            style={styles.openRide}
          >
            Open navigation →
          </Text>
        </Pressable>
      )}

      {!activeRide &&
        isOnline &&
        requestedRides.length > 0 && (
          <Pressable
            style={
              styles.requestCard
            }
            onPress={
              handleRideRequests
            }
          >
            <View>
              <Text
                style={
                  styles.requestCount
                }
              >
                {requestedRides.length}
              </Text>

              <Text
                style={
                  styles.requestTitle
                }
              >
                New ride request
                {requestedRides.length >
                1
                  ? 's'
                  : ''}
              </Text>

              <Text
                style={
                  styles.requestDescription
                }
              >
                Tap to view available
                rides.
              </Text>
            </View>

            <Text
              style={styles.arrow}
            >
              →
            </Text>
          </Pressable>
        )}

      <View
        style={styles.statsRow}
      >
        <Pressable
          style={styles.statCard}
          onPress={() => navigation.navigate('Earnings')}
          accessibilityRole="button"
        >
          <Text
            style={styles.statValue}
          >
            ₹
            {totalEarnings.toFixed(
              0,
            )}
          </Text>

          <Text
            style={styles.statLabel}
          >
            CAPTURED PAYMENTS
          </Text>
        </Pressable>

        <Pressable
          style={styles.statCard}
          onPress={() => navigation.navigate('Completed')}
          accessibilityRole="button"
        >
          <Text
            style={styles.statValue}
          >
            {rideHistory.length}
          </Text>

          <Text
            style={styles.statLabel}
          >
            COMPLETED
          </Text>
        </Pressable>

        <Pressable
          style={styles.statCard}
          onPress={handleRideRequests}
          accessibilityRole="button"
        >
          <Text
            style={styles.statValue}
          >
            {requestedRides.length}
          </Text>

          <Text
            style={styles.statLabel}
          >
            REQUESTS
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.screen,
  },

  content: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },

  greeting: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  title: {
    ...typography.screenTitle,
    color: colors.text,
  },

  onlineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.textMuted,
  },

  onlineDotActive: {
    backgroundColor: colors.success,
  },

  statusCard: {
    ...commonStyles.card,
    marginBottom: spacing.lg,
  },

  statusLabel: {
    ...typography.label,
    color: colors.textMuted,
  },

  statusValue: {
    marginTop: spacing.sm,
    ...typography.title,
    color: colors.text,
  },

  statusDescription: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textSecondary,
  },

  onlineButton: {
    marginTop: spacing.lg,
    height: 50,
    borderRadius: spacing.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  offlineButton: {
    backgroundColor: colors.textSecondary,
  },

  onlineButtonText: {
    ...typography.button,
    color: colors.primaryText,
  },

  activeCard: {
    ...commonStyles.card,
    marginBottom: spacing.lg,
  },

  activeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  activeLabel: {
    ...typography.label,
    color: colors.textMuted,
  },

  activeStatus: {
    marginTop: spacing.xs,
    ...typography.bodyStrong,
    color: colors.success,
  },

  activeFare: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },

  routeRow: {
    flexDirection: 'row',
  },

  routeIndicator: {
    width: 18,
    alignItems: 'center',
    paddingTop: 4,
  },

  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.pickup,
  },

  routeLine: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    marginVertical: 4,
  },

  dropDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.destination,
  },

  routeText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  locationLabel: {
    ...typography.label,
    color: colors.textMuted,
  },

  locationValue: {
    marginTop: 3,
    ...typography.bodyStrong,
    color: colors.text,
  },

  routeGap: {
    height: spacing.md,
  },

  openRide: {
    marginTop: spacing.lg,
    ...typography.bodyStrong,
    color: colors.text,
    textAlign: 'right',
  },

  requestCard: {
    ...commonStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  requestCount: {
    ...typography.title,
    color: colors.text,
  },

  requestTitle: {
    marginTop: 2,
    ...typography.bodyStrong,
    color: colors.text,
  },

  requestDescription: {
    marginTop: 3,
    ...typography.caption,
    color: colors.textSecondary,
  },

  arrow: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  statCard: {
    flex: 1,
    ...commonStyles.card,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },

  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },

  statLabel: {
    marginTop: spacing.xs,
    ...typography.label,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
