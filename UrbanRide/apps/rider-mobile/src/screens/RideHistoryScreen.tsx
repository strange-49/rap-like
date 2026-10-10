import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getRiderRideHistory, type RequestedRide } from '../config/api';

function fareOf(ride: RequestedRide): number | null {
  const value = ride.finalFare ?? ride.estimatedFare;
  if (value == null) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export default function RideHistoryScreen() {
  const [rides, setRides] = useState<RequestedRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);

  const loadRides = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const rows = await getRiderRideHistory();
      setRides(rows.filter((ride) => ride.status === 'COMPLETED'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load completed rides.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadRides();
    const timer = setInterval(() => void loadRides(true), 10000);
    return () => clearInterval(timer);
  }, [loadRides]));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadRides(true)} />}
    >
      <Text style={styles.title}>Completed Rides</Text>
      {loading && <Text>Loading completed rides…</Text>}
      {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      {!loading && !error && rides.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No completed rides</Text>
          <Text>Completed rides assigned to your account will appear here.</Text>
        </View>
      )}

      {rides.map((ride) => {
        const fare = fareOf(ride);
        const expanded = expandedRideId === ride.id;
        return (
          <Pressable
            key={ride.id}
            style={styles.rideCard}
            onPress={() => setExpandedRideId(expanded ? null : ride.id)}
            accessibilityRole="button"
            accessibilityLabel={`Ride on ${new Date(ride.requestedAt).toLocaleString()}, ${expanded ? 'hide' : 'show'} details`}
          >
            <View style={styles.rideHeader}>
              <Text style={styles.route} numberOfLines={2}>{ride.pickupAddress} → {ride.dropAddress}</Text>
              <Text style={styles.amount}>{fare == null ? 'Fare unavailable' : `₹${fare.toFixed(2)}`}</Text>
            </View>
            <Text style={styles.meta}>Requested: {new Date(ride.requestedAt).toLocaleString()}</Text>
            <Text style={styles.meta}>Status: {ride.status} · Payment: {ride.payment?.status ?? 'UNPAID'}</Text>
            {expanded && (
              <View style={styles.details}>
                <Text>Ride ID: {ride.id}</Text>
                <Text>Ride fare: {fare == null ? 'Unavailable' : `₹${fare.toFixed(2)}`}</Text>
                <Text>Payment amount: {ride.payment ? `₹${Number(ride.payment.amount).toFixed(2)}` : 'None recorded'}</Text>
                <Text>Payment mode: {ride.payment?.mode ?? '—'}</Text>
                <Text>Distance: {ride.estimatedDistance == null ? 'Unavailable' : `${Number(ride.estimatedDistance).toFixed(2)} km`}</Text>
                <Text>Completed: {ride.completedAt ? new Date(ride.completedAt).toLocaleString() : 'Completion confirmed'}</Text>
                <Text>Start OTP: {ride.startOtpRequired ? 'Required' : 'Not required'}</Text>
              </View>
            )}
            <Text style={styles.tapHint}>{expanded ? 'Tap to hide details' : 'Tap for ride details'}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 24, marginBottom: 24 },
  rideCard: { padding: 18, borderRadius: 12, backgroundColor: '#fff', marginBottom: 12 },
  rideHeader: { gap: 8, marginBottom: 8 },
  route: { fontSize: 16, fontWeight: '600' },
  amount: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 5 },
  details: { gap: 7, borderTopWidth: 1, borderTopColor: '#ddd', marginTop: 12, paddingTop: 12 },
  tapHint: { marginTop: 12, color: '#47617c', fontSize: 12 },
  emptyCard: { padding: 24, borderRadius: 12, backgroundColor: '#fff', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  error: { color: '#b42318', marginBottom: 12 },
});
