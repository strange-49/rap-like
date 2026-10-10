import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getRiderRideHistory, type RequestedRide } from '../config/api';

function rideFare(ride: RequestedRide): number | null {
  const value = ride.finalFare ?? ride.estimatedFare;
  if (value == null) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export default function EarningsScreen() {
  const [rides, setRides] = useState<RequestedRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const rows = await getRiderRideHistory();
      setRides(rows.filter((ride) => ride.status === 'COMPLETED'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load payment and ride data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
    const timer = setInterval(() => void load(true), 10000);
    return () => clearInterval(timer);
  }, [load]));

  const capturedTotal = useMemo(() => rides.reduce((sum, ride) => (
    ride.payment?.status === 'CAPTURED' && Number.isFinite(Number(ride.payment.amount))
      ? sum + Number(ride.payment.amount)
      : sum
  ), 0), [rides]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
    >
      <Text style={styles.title}>Earnings</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Captured customer payments</Text>
        <Text style={styles.summaryAmount}>₹{capturedTotal.toFixed(2)}</Text>
        <Text style={styles.note}>This is the amount captured from customers for these rides. Rider commission and payout are not calculated by the current backend.</Text>
      </View>

      {loading && <Text>Loading earnings…</Text>}
      {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      {!loading && !error && rides.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No completed rides yet</Text>
          <Text>Ride payment breakdowns will appear here after completion.</Text>
        </View>
      )}
      {rides.map((ride) => {
        const fare = rideFare(ride);
        const payment = ride.payment;
        return (
          <View key={ride.id} style={styles.rideCard}>
            <Text style={styles.route}>{ride.pickupAddress} → {ride.dropAddress}</Text>
            <Text style={styles.meta}>{ride.completedAt ? new Date(ride.completedAt).toLocaleString() : new Date(ride.requestedAt).toLocaleString()}</Text>
            <Text>Ride fare: {fare == null ? 'Unavailable' : `₹${fare.toFixed(2)}`}</Text>
            <Text>Payment status: {payment?.status ?? 'UNPAID'}</Text>
            <Text>Captured amount: {payment?.status === 'CAPTURED' ? `₹${Number(payment.amount).toFixed(2)}` : '₹0.00'}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 24, paddingBottom: 40, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  summaryCard: { padding: 20, borderRadius: 12, backgroundColor: '#fff', gap: 8, marginBottom: 8 },
  summaryLabel: { fontSize: 14, fontWeight: '600' },
  summaryAmount: { fontSize: 30, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 19 },
  rideCard: { padding: 18, borderRadius: 12, backgroundColor: '#fff', gap: 7 },
  route: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, marginBottom: 3 },
  emptyCard: { padding: 24, borderRadius: 12, backgroundColor: '#fff', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  error: { color: '#b42318' },
});
