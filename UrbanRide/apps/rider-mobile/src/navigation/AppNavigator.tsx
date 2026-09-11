import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ActiveRideScreen from '../screens/ActiveRideScreen';
import RideRequestsScreen from '../screens/RideRequestsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TabNavigator from './TabNavigator';

type RootStackParamList = {
  MainTabs: undefined;
  RideRequests: undefined;
  ActiveRide: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="RideRequests" component={RideRequestsScreen} />
        <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
