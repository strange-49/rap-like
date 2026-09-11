import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <Pressable style={styles.row}>
          <Text style={styles.label}>Notifications</Text>
          <Text style={styles.value}>Enabled</Text>
        </Pressable>

        <Pressable style={styles.row}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>Required</Text>
        </Pressable>

        <Pressable style={styles.row}>
          <Text style={styles.label}>Language</Text>
          <Text style={styles.value}>English</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Support</Text>

        <Pressable style={styles.row}>
          <Text style={styles.label}>Help & Support</Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>

        <Pressable style={styles.row}>
          <Text style={styles.label}>Terms & Conditions</Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>

        <Pressable style={styles.row}>
          <Text style={styles.label}>Privacy Policy</Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      </View>

      <Text style={styles.version}>UrbanRide Rider v0.1.0</Text>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    minHeight: 52,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
  },
  arrow: {
    fontSize: 18,
  },
  version: {
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 16,
    fontSize: 13,
  },
});
