const fs = require('fs');
const path = require('path');

const googleServicesPath = path.join(
  __dirname,
  'google-services.json',
);

const googleServices = JSON.parse(
  fs.readFileSync(googleServicesPath, 'utf8'),
);

const googleMapsApiKey =
  googleServices?.client?.[0]?.api_key?.[0]?.current_key;

if (!googleMapsApiKey) {
  throw new Error(
    'Google Maps API key was not found in google-services.json',
  );
}

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
      [
        'react-native-maps',
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ],
  },
};