import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type RootStackParamList = {
  Settings: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList>;

export default function ProfileScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rider Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>R</Text>
        </View>

        <Text style={styles.name}>Rider</Text>
        <Text style={styles.role}>UrbanRide Partner</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Account Information</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>Not connected</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>Not connected</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Vehicle</Text>
          <Text style={styles.value}>Not registered</Text>
        </View>
      </View>

      <Pressable
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.settingsButtonText}>Settings</Text>
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
  profileCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
  },
  role: {
    fontSize: 14,
    marginTop: 4,
  },
  infoCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#111111',
  },
  settingsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
