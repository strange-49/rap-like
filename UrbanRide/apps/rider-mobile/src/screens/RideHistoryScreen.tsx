import { StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';

import type { RootState } from '../store/store';

export default function RideHistoryScreen() {
  const rides = useSelector((state: RootState) => state.rider.rideHistory);

  const totalEarnings = rides.reduce((total, ride) => {
    return total + Number(ride.amount.replace('Rs. ', ''));
  }, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ride History</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Earnings</Text>
        <Text style={styles.summaryValue}>Rs. {totalEarnings}</Text>
        <Text style={styles.summaryMeta}>
          {rides.length} completed {rides.length === 1 ? 'ride' : 'rides'}
        </Text>
      </View>

      {rides.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No completed rides</Text>
          <Text style={styles.emptyText}>
            Completed rides will appear here.
          </Text>
        </View>
      ) : (
        rides.map((ride) => (
          <View key={ride.id} style={styles.rideCard}>
            <View style={styles.rideHeader}>
              <Text style={styles.rideId}>{ride.id}</Text>
              <Text style={styles.amount}>{ride.amount}</Text>
            </View>

            <Text style={styles.route}>
              {ride.pickup} {'->'} {ride.drop}
            </Text>

            <Text style={styles.time}>{ride.time}</Text>
          </View>
        ))
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
    marginBottom: 24,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: '700',
  },
  summaryMeta: {
    fontSize: 14,
    marginTop: 4,
  },
  rideCard: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rideId: {
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  route: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  time: {
    fontSize: 13,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
  },
});
