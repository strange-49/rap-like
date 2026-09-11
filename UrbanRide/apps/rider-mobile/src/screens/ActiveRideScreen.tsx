import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { completeRide } from '../store/riderSlice';
import type { AppDispatch, RootState } from '../store/store';

type RootStackParamList = {
  MainTabs: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList>;

export default function ActiveRideScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const activeRide = useSelector((state: RootState) => state.rider.activeRide);

  const handleComplete = () => {
    dispatch(completeRide());
    navigation.navigate('MainTabs');
  };

  if (!activeRide) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Active Ride</Text>
        <Text style={styles.emptyText}>
          There is currently no active ride.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Ride</Text>

      <View style={styles.statusCard}>
        <Text style={styles.status}>RIDE IN PROGRESS</Text>
        <Text style={styles.passenger}>Passenger Ride</Text>
      </View>

      <View style={styles.rideCard}>
        <View style={styles.locationBlock}>
          <Text style={styles.label}>Pickup</Text>
          <Text style={styles.location}>{activeRide.pickup}</Text>
        </View>

        <View style={styles.locationBlock}>
          <Text style={styles.label}>Drop</Text>
          <Text style={styles.location}>{activeRide.drop}</Text>
        </View>

        <View style={styles.detailsRow}>
          <View>
            <Text style={styles.label}>Distance</Text>
            <Text style={styles.value}>6.2 km</Text>
          </View>

          <View>
            <Text style={styles.label}>Fare</Text>
            <Text style={styles.value}>{activeRide.amount}</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.completeButton} onPress={handleComplete}>
        <Text style={styles.completeText}>Complete Ride</Text>
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
    marginBottom: 24,
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  status: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  passenger: {
    fontSize: 18,
    fontWeight: '600',
  },
  rideCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
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
  completeButton: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#111111',
  },
  completeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
  },
});
