import type { ExpoConfig } from '@expo/config';

require('dotenv').config();

const defineConfig = (): ExpoConfig => ({
  name: 'SafeRouteExpo',
  slug: 'SafeRouteExpo',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSMicrophoneUsageDescription: "This app uses the microphone to enable voice-activated SOS commands.",
      NSSpeechRecognitionUsageDescription: "This app uses speech recognition to listen for the SOS activation phrase."
    },
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    softwareKeyboardLayoutMode: 'pan',
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  scheme: 'saferouteexpo',
  facebookAppId: 'YOUR_FACEBOOK_APP_ID',
  facebookDisplayName: 'SafeRouteExpo',
  facebookScheme: 'fbYOUR_FACEBOOK_APP_ID',
} as any);

export default defineConfig;
