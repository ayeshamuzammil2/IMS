import type { ExpoConfig, ConfigContext } from 'expo/config';

const VARIANT = process.env.APP_VARIANT ?? 'development';
const IS_DEV = VARIANT === 'development';

const NAME: Record<string, string> = {
  development: 'PIA IMS',
  staging: 'PIA IMS (Stg)',
  production: 'PIA Internee Management',
};

const PACKAGE: Record<string, string> = {
  development: 'com.pia.internshipsystem.dev',
  staging: 'com.pia.internshipsystem.stg',
  production: 'com.pia.internshipsystem',
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: NAME[VARIANT],
  slug: 'pia-internship-system',
  scheme: 'piaims',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/pia-logo.png',
  assetBundlePatterns: ['**/*'],

  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:5000',
    variant: VARIANT,
  },

  android: {
    package: PACKAGE[VARIANT],
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#FFFFFF', // Clean White Background
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.VIBRATE',
    ],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },

  ios: {
    bundleIdentifier: PACKAGE[VARIANT],
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription:
        'PIA IMS needs the camera to verify your identity when marking attendance.',
    },
  },

  plugins: [
    'expo-dev-client',
    'expo-secure-store',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#F4F9F5', // Soft Light Greenish-White
        dark: { backgroundColor: '#0B1F16' }, // Dark mode option
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: IS_DEV,
          enableProguardInReleaseBuilds: true,
        },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'PIA IMS checks your location to confirm you are inside your department premises before marking attendance.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'PIA IMS needs access to your photos so you can upload your profile picture and documents.',
        cameraPermission: 'PIA IMS needs the camera to take your profile picture.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#00502B', // PIA Green for icon highlights
      },
    ],
  ],
});