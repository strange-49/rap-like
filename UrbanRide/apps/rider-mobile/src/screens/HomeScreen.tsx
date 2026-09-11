import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type RootStackParamList = {
  RideRequests: undefined;
  ActiveRide: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList>;

export default function HomeScreen({ navigation }: Props) {
  const [isOnline, setIsOnline] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>UrbanRide Rider</Text>
      <Text style={styles.greeting}>Good evening, Rider ??</Text>

      <View style={styles.statusCard}>
        <Text style={styles.cardLabel}>Rider Status</Text>

        <Text style={styles.status}>
          {isOnline ? '? ONLINE' : '? OFFLINE'}
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => setIsOnline((current) => !current)}
        >
          <Text style={styles.primaryButtonText}>
            {isOnline ? 'Go Offline' : 'Go Online'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.cardLabel}>Today's Earnings</Text>
          <Text style={styles.statValue}>?0</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.cardLabel}>Today's Rides</Text>
          <Text style={styles.statValue}>0</Text>
        </View>
      </View>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('RideRequests')}
      >
        <Text style={styles.secondaryButtonText}>Ride Requests</Text>
      </Pressable>
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
