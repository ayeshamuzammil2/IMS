import type { AppTheme, ChartPalette, ThemeColors } from './types';
import { radii, spacing, typography, makeShadows } from './tokens';

export const darkColors: ThemeColors = {
  background: '#0C120E',
  surface: '#16211A',
  surfaceAlt: '#1E2C22',
  surfaceSunken: '#101A13',
  border: '#2C3F31',
  borderStrong: '#3E5644',

  primary: '#66BB6A',
  primaryHover: '#81C784',
  primaryMuted: '#43A047',
  onPrimary: '#062B0A',
  primaryContainer: '#1B5E20',
  onPrimaryContainer: '#C8E6C9',
  accent: '#A5D6A7',

  textPrimary: '#E6F0E8',
  textSecondary: '#A8BFAE',
  textMuted: '#82998A',
  textOnDark: '#E6F0E8',
  textOnDarkMuted: '#A8BFAE',

  success: '#66BB6A',
  successBg: '#122A16',
  warning: '#FFC246',
  warningBg: '#2E2410',
  error: '#FF8A80',
  errorBg: '#2E1614',
  info: '#82B1FF',
  infoBg: '#131F33',
  gold: '#E0C060',
  slate: '#94A3B8',
  slateLight: '#64748B',

  overlay: 'rgba(0,0,0,0.66)',
  shadowColor: '#000000',
  skeleton: '#1E2C22',
  skeletonShimmer: '#2C3F31',
  // Dark header is the dark surface, not saturated green - a green bar in dark mode is glare.
  headerBg: '#16211A',
  drawerBg: '#101A13',
  tabInactive: '#82998A',
};

export const darkCharts: ChartPalette = {
  categorical: ['#43A047', '#3987E5', '#D95926', '#9085E9', '#C98500', '#D55181'],
  sequential: ['#0F3D13', '#1B5E20', '#2E7D32', '#4CAF50', '#81C784', '#A5D6A7', '#C1E4C3'],
  ordinal: ['#1B5E20', '#2E7D32', '#4CAF50', '#81C784'],
  gridline: '#233326',
  axis: '#3E5644',
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: darkColors,
  spacing,
  radii,
  typography,
  shadows: makeShadows('#000000', [0.3, 0.4, 0.5]),
  charts: darkCharts,
};
