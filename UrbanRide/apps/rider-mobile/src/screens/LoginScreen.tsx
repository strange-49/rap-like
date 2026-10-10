import {
  useState,
} from 'react';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  loginRider,
} from '../config/api';
import {
  setRiderSession,
} from '../config/auth';

type LoginScreenProps = {
  onLoginSuccess: () => void;
};

export default function LoginScreen({
  onLoginSuccess,
}: LoginScreenProps) {
  const [username, setUsername] =
    useState('rider');

  const [password, setPassword] =
    useState('rider-dev-password');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleLogin() {
    if (loading) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const session =
        await loginRider(
          username.trim(),
          password,
        );

      setRiderSession(session);

      onLoginSuccess();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Rider login failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        UrbanRide Rider
      </Text>

      <Text style={styles.subtitle}>
        Rider Login
      </Text>

      <TextInput
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Username"
        style={styles.input}
        editable={!loading}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        style={styles.input}
        editable={!loading}
      />

      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button
          title="Login"
          onPress={handleLogin}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    color: '#c62828',
    textAlign: 'center',
  },
});