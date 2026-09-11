import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';

import { acceptRide } from '../store/riderSlice';
import type { AppDispatch } from '../store/store';

type RootStackParamList = {
  MainTabs: undefined;
  ActiveRide: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList>;

const requestedRide = {
  id: 'UR1001',
  pickup: 'Indiranagar Metro Station',
  drop: 'Koramangala 5th Block',
  amount: 'Rs. 145',
  time: 'Today, 6:30 PM',
};

export default function RideRequestsScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();

  const handleAccept = () => {
    dispatch(acceptRide(requestedRide));
    navigation.navigate('ActiveRide');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ride Request</Text>

      <View style={styles.requestCard}>
        <Text style={styles.status}>NEW REQUEST</Text>

        <View style={styles.locationBlock}>
          <Text style={styles.label}>Pickup</Text>
          <Text style={styles.location}>{requestedRide.pickup}</Text>
        </View>

        <View style={styles.locationBlock}>
          <Text style={styles.label}>Drop</Text>
          <Text style={styles.location}>{requestedRide.drop}</Text>
        </View>

        <View style={styles.detailsRow}>
          <View>
            <Text style={styles.label}>Distance</Text>
            <Text style={styles.value}>6.2 km</Text>
          </View>

          <View>
            <Text style={styles.label}>Estimated Fare</Text>
            <Text style={styles.value}>{requestedRide.amount}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.declineButton}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>

        <Pressable style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.acceptText}>Accept Ride</Text>
        </Pressable>
      </View>
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
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  declineButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  declineText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  acceptButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#111111',
  },
  acceptText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
