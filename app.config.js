// Adds Firebase (needed for Android push notifications) only when
// google-services.json is in the project folder, so builds never fail without it.
// Adds Google Sign-In's iOS setup only once its client ID is filled in oauth.json.
const fs = require('fs');
const path = require('path');
const oauth = require('./oauth.json');

module.exports = ({ config }) => {
  const googleServices = path.join(__dirname, 'google-services.json');
  if (fs.existsSync(googleServices)) {
    config.android = { ...config.android, googleServicesFile: './google-services.json' };
  }
  if (oauth.googleIosClientId) {
    // The iOS URL scheme is the iOS client ID written backwards.
    const scheme = oauth.googleIosClientId.split('.').reverse().join('.');
    config.plugins = [...(config.plugins || []), ['@react-native-google-signin/google-signin', { iosUrlScheme: scheme }]];
  }
  return config;
};
