import type { ThemeRadii, ThemeShadow, ThemeSpacing, ThemeTypography } from './types';

export const spacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii: ThemeRadii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const typography: ThemeTypography = {
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  overline: { fontSize: 11, fontWeight: '600', lineHeight: 14, letterSpacing: 0.6 },
};

export function makeShadows(shadowColor: string, opacities: [number, number, number]): {
  sm: ThemeShadow;
  md: ThemeShadow;
  lg: ThemeShadow;
} {
  return {
    sm: { shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: opacities[0], shadowRadius: 2, elevation: 1 },
    md: { shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: opacities[1], shadowRadius: 6, elevation: 3 },
    lg: { shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: opacities[2], shadowRadius: 12, elevation: 6 },
  };
}
