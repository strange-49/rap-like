import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type RootStackParamList = {
  RideRequests: undefined;
  ActiveRide: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>UrbanRide Rider</Text>
      <Text style={styles.subtitle}>Welcome, Rider</Text>

      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('RideRequests')}
      >
        <Text style={styles.buttonText}>Ride Requests</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('ActiveRide')}
      >
        <Text style={styles.buttonText}>Active Ride</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  button: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
