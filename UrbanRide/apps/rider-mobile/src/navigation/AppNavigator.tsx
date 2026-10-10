import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import { getRiderSession } from '../config/auth';

import ActiveRideScreen from '../screens/ActiveRideScreen';
import LoginScreen from '../screens/LoginScreen';
import RideRequestsScreen from '../screens/RideRequestsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RideHistoryScreen from '../screens/RideHistoryScreen';
import EarningsScreen from '../screens/EarningsScreen';

import TabNavigator from './TabNavigator';

export type RootStackParamList = {
  Login: undefined;

  MainTabs: undefined;

  RideRequests: undefined;

  ActiveRide: {
    rideId?: string;
  };

  Settings: undefined;
  Completed: undefined;
  Earnings: undefined;
};

export const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

const Stack =
  createNativeStackNavigator<RootStackParamList>();

type AppNavigatorProps = {
  authenticated: boolean;
  onLoginSuccess: () => void;
};

export default function AppNavigator({
  authenticated,
  onLoginSuccess,
}: AppNavigatorProps) {
  const hasSession =
    authenticated &&
    Boolean(getRiderSession());

  return (
    <NavigationContainer
      ref={navigationRef}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!hasSession ? (
          <Stack.Screen name="Login">
            {() => (
              <LoginScreen
                onLoginSuccess={
                  onLoginSuccess
                }
              />
            )}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={TabNavigator}
            />

            <Stack.Screen
              name="RideRequests"
              component={
                RideRequestsScreen
              }
            />

            <Stack.Screen
              name="ActiveRide"
              component={
                ActiveRideScreen
              }
            />

            <Stack.Screen
              name="Settings"
              component={
                SettingsScreen
              }
            />

            <Stack.Screen name="Completed" component={RideHistoryScreen} />
            <Stack.Screen name="Earnings" component={EarningsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
