import type { AppTheme, ChartPalette, ThemeColors } from './types';
import { radii, spacing, typography, makeShadows } from './tokens';

export const darkColors: ThemeColors = {
  // Deep Background for high contrast against cards
  background: '#070B08',
  surface: '#141E17',
  surfaceAlt: '#1B2A1E',
  surfaceSunken: '#0D150F',

  // Crisp high-contrast borders so cards/inputs stand out
  border: '#263B2C',
  borderStrong: '#3A5741',

  // Primary Action Colors
  primary: '#4CAF50',
  primaryHover: '#66BB6A',
  primaryMuted: '#2E7D32',
  onPrimary: '#FFFFFF',
  primaryContainer: '#103B14', // Distinct active button/chip background
  onPrimaryContainer: '#C8E6C9',
  accent: '#81C784',

  // Crisp High-Contrast Typography (No blurriness or mixing)
  textPrimary: '#F1F5F2',
  textSecondary: '#B0C4B4',
  textMuted: '#7D9684',
  textOnDark: '#F1F5F2',
  textOnDarkMuted: '#B0C4B4',

  // Feedback Colors
  success: '#4CAF50',
  successBg: '#0E2412',
  warning: '#FFC107',
  warningBg: '#2A200B',
  error: '#FF5252',
  errorBg: '#2C1010',
  info: '#64B5F6',
  infoBg: '#0F2133',
  gold: '#FFD54F',
  slate: '#94A3B8',
  slateLight: '#64748B',

  // Navigation & Overlays
  overlay: 'rgba(0,0,0,0.75)',
  shadowColor: '#000000',
  skeleton: '#1A271C',
  skeletonShimmer: '#263B2C',
  headerBg: '#141E17',
  drawerBg: '#0D150F',
  tabInactive: '#7D9684',
};

export const darkCharts: ChartPalette = {
  categorical: ['#4CAF50', '#42A5F5', '#FF7043', '#AB47BC', '#FFA726', '#EC407A'],
  sequential: ['#0B2E0E', '#103B14', '#1B5E20', '#2E7D32', '#4CAF50', '#81C784', '#C8E6C9'],
  ordinal: ['#103B14', '#2E7D32', '#4CAF50', '#81C784'],
  gridline: '#1E2F22',
  axis: '#3A5741',
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: darkColors,
  spacing,
  radii,
  typography,
  shadows: makeShadows('#000000', [0.4, 0.5, 0.6]),
  charts: darkCharts,
};