export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;

  primary: string;
  primaryHover: string;
  primaryMuted: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  accent: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnDark: string;
  textOnDarkMuted: string;

  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
  info: string;
  infoBg: string;
  gold: string;
  slate: string;
  slateLight: string;

  overlay: string;
  shadowColor: string;
  skeleton: string;
  skeletonShimmer: string;
  headerBg: string;
  drawerBg: string;
  tabInactive: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeRadii {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface ThemeTypography {
  h1: { fontSize: number; fontWeight: '700'; lineHeight: number };
  h2: { fontSize: number; fontWeight: '700'; lineHeight: number };
  h3: { fontSize: number; fontWeight: '600'; lineHeight: number };
  body: { fontSize: number; fontWeight: '400'; lineHeight: number };
  bodyStrong: { fontSize: number; fontWeight: '600'; lineHeight: number };
  caption: { fontSize: number; fontWeight: '400'; lineHeight: number };
  overline: { fontSize: number; fontWeight: '600'; lineHeight: number; letterSpacing: number };
}

export interface ThemeShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ChartPalette {
  categorical: string[];
  sequential: string[];
  ordinal: string[];
  gridline: string;
  axis: string;
}

export interface AppTheme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radii: ThemeRadii;
  typography: ThemeTypography;
  shadows: { sm: ThemeShadow; md: ThemeShadow; lg: ThemeShadow };
  charts: ChartPalette;
}
