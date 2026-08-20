import type { AppTheme, ChartPalette, ThemeColors } from './types';
import { radii, spacing, typography, makeShadows } from './tokens';

export const lightColors: ThemeColors = {
  background: '#E8F5E9',
  surface: '#FFFFFF',
  surfaceAlt: '#F4FBF4',
  surfaceSunken: '#DCEEDD',
  border: '#C8E6C9',
  borderStrong: '#A5D6A7',

  primary: '#1B5E20',
  primaryHover: '#164A1A',
  primaryMuted: '#2E7D32',
  onPrimary: '#FFFFFF',
  primaryContainer: '#A5D6A7',
  onPrimaryContainer: '#0B3D0E',
  accent: '#66BB6A',

  textPrimary: '#14261A',
  textSecondary: '#47614F',
  textMuted: '#5C7764',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#C8E6C9',

  success: '#1B5E20',
  successBg: '#E8F5E9',
  warning: '#8A5300',
  warningBg: '#FFF6E0',
  error: '#C62828',
  errorBg: '#FDEAEA',
  info: '#0F4C9C',
  infoBg: '#E8F1FC',
  gold: '#8A6A00',

  overlay: 'rgba(8,36,11,0.55)',
  shadowColor: '#0F3D13',
  skeleton: '#DCEEDD',
  skeletonShimmer: '#F0F9F0',
  headerBg: '#1B5E20',
  drawerBg: '#FFFFFF',
  tabInactive: '#5C7764',
};

export const lightCharts: ChartPalette = {
  categorical: ['#2E7D32', '#2A78D6', '#EB6834', '#4A3AA7', '#EDA100', '#E87BA4'],
  sequential: ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#4CAF50', '#2E7D32', '#1B5E20'],
  ordinal: ['#81C784', '#4CAF50', '#2E7D32', '#1B5E20'],
  gridline: '#D7EAD8',
  axis: '#A5D6A7',
};

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: lightColors,
  spacing,
  radii,
  typography,
  shadows: makeShadows('#0F3D13', [0.06, 0.1, 0.16]),
  charts: lightCharts,
};
