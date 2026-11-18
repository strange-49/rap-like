module.exports = {
  expo: {
    name: 'UrbanRide Rider',
    slug: 'urbanride-rider',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',

    android: {
      package: 'com.urbanride.rider',
      googleServicesFile: './google-services.json',
    },

    plugins: [
      'expo-notifications',
      ['expo-location', {
        locationWhenInUsePermission: 'UrbanRide uses your location while you are online to find nearby requests and share active trip progress.',
      }],
      'expo-secure-store',
      '@maplibre/maplibre-react-native',
    ],
  },
};
