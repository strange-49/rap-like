
module.exports = {
  expo: {
    name: 'UrbanRide Rider',
    slug: 'urbanride-rider',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',

    // App launcher icon
    icon: './assets/icon.png',

    android: {
      package: 'com.urbanride.rider',
      googleServicesFile: './google-services.json',

      // Android adaptive launcher icon
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#FFFFFF',
      },
    },

    plugins: [
      'expo-notifications',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'UrbanRide uses your location while you are online to find nearby requests and share active trip progress.',
        },
      ],
      'expo-secure-store',
      '@maplibre/maplibre-react-native',
    ],
  },
};
