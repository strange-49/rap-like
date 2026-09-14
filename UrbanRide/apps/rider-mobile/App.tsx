import { useEffect } from 'react';
import { Provider } from 'react-redux';

import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications } from './src/notifications/notifications';
import { store } from './src/store/store';

export default function App() {
  useEffect(() => {
    registerForPushNotifications()
      .then((token) => {
        if (token) {
          console.log('RIDER_PUSH_TOKEN', token);
        }
      })
      .catch((error) => {
        console.error(
          'Failed to register for push notifications.',
          error,
        );
      });
  }, []);

  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
}