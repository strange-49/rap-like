import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { toggleOnline } from '../store/riderSlice';
import type { AppDispatch, RootState } from '../store/store';

type RootStackParamList = {
  RideRequests: undefined;
  ActiveRide: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList>;

export default function HomeScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const isOnline = useSelector((state: RootState) => state.rider.isOnline);
  const activeRide = useSelector((state: RootState) => state.rider.activeRide);
  const rideHistory = useSelector((state: RootState) => state.rider.rideHistory);

  const totalEarnings = rideHistory.reduce((total, ride) => {
    return total + Number(ride.amount.replace('Rs. ', ''));
  }, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>UrbanRide Rider</Text>
      <Text style={styles.greeting}>Good evening, Rider 👋</Text>

      <View style={styles.statusCard}>
        <Text style={styles.cardLabel}>Rider Status</Text>

        <Text style={styles.status}>
          {isOnline ? '● ONLINE' : '● OFFLINE'}
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => dispatch(toggleOnline())}
        >
          <Text style={styles.primaryButtonText}>
            {isOnline ? 'Go Offline' : 'Go Online'}
          </Text>
        </Pressable>
      </View>

      {activeRide && (
        <View style={styles.activeCard}>
          <Text style={styles.activeLabel}>ACTIVE RIDE</Text>
          <Text style={styles.activeRoute}>
            {activeRide.pickup} {'->'} {activeRide.drop}
          </Text>

          <Pressable
            style={styles.activeButton}
            onPress={() => navigation.navigate('ActiveRide')}
          >
            <Text style={styles.activeButtonText}>View Active Ride</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.cardLabel}>Today's Earnings</Text>
          <Text style={styles.statValue}>Rs. {totalEarnings}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.cardLabel}>Completed Rides</Text>
          <Text style={styles.statValue}>{rideHistory.length}</Text>
        </View>
      </View>

      {!activeRide && (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('RideRequests')}
        >
          <Text style={styles.secondaryButtonText}>Ride Requests</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 24,
  },
  greeting: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  status: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  primaryButton: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#111111',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  activeRoute: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  activeButton: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#111111',
  },
  activeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
