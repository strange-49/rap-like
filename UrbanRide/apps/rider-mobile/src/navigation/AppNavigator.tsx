import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ActiveRideScreen from '../screens/ActiveRideScreen';
import RideRequestsScreen from '../screens/RideRequestsScreen';
import TabNavigator from './TabNavigator';

type RootStackParamList = {
  MainTabs: undefined;
  RideRequests: undefined;
  ActiveRide: undefined;
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
