import { Platform, StyleSheet } from 'react-native';
import { ThemeMode } from '../types';

/**
 * OSIF tasarım sistemi.
 * Kâğıt / kemik / is siyahı zemin + tek zanaat rengi (vermilion).
 * Hiyerarşi kutularla değil; boşluk, tipografi ve hairline ayraçlarla kurulur.
 */
export const lightColors = {
  canvas: '#F2ECE1',      // sıcak kâğıt zemin
  bone: '#E8E0D0',        // kemik: pasif yüzeyler, track
  stone: '#CFC4AF',       // taş: orta ton
  ink: '#1E1B17',         // is siyahı: ana metin
  inkMuted: '#6E655A',    // ikincil metin
  inkFaint: '#9C9283',    // üçüncül metin / placeholder
  hairline: 'rgba(30, 27, 23, 0.16)',
  accent: '#B2412A',      // derin kiremit / vermilion (tek vurgu)
  accentMuted: 'rgba(178, 65, 42, 0.12)',
} as const;

export const darkColors = {
  canvas: '#161412',      // koyu is/grafit kâğıt zemin
  bone: '#24201C',        // koyu kemik: yüzeyler, track
  stone: '#3D3730',       // taş: orta ton
  ink: '#ECE5D8',         // parşömen kâğıt beyazı
  inkMuted: '#A89E8E',    // ikincil metin
  inkFaint: '#736B5E',    // üçüncül metin
  hairline: 'rgba(236, 229, 216, 0.15)',
  accent: '#E05A3E',      // sıcak parlak vermilion
  accentMuted: 'rgba(224, 90, 62, 0.15)',
} as const;

export type ThemeColors = {
  readonly [K in keyof typeof lightColors]: string;
};

export const colors = lightColors;

export function getThemeColors(mode: ThemeMode = 'light'): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors;
}

export const fonts = {
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }) as string,
  sans: Platform.select({ ios: 'System', default: 'sans-serif' }) as string,
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 56 } as const;

export const type = StyleSheet.create({
  display: { fontFamily: fonts.serif, fontSize: 48, lineHeight: 54, letterSpacing: -1, color: colors.ink },
  title: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 32, color: colors.ink },
  numeral: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 42, letterSpacing: -1, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, color: colors.ink },
  meta: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.inkMuted },
  eyebrow: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    fontWeight: '600',
    color: colors.inkMuted,
  },
});

/** Fiziksel his veren yay profilleri */
export const springs = {
  /** Basılma / bırakılma: kısa, sert, hafif geri tepme */
  press: { damping: 15, stiffness: 520, mass: 0.5 },
  /** Mekanik anahtar: net yerine oturma, minik overshoot */
  detent: { damping: 11, stiffness: 340, mass: 0.7 },
  /** Damga / vurgu geri tepmesi */
  stamp: { damping: 9, stiffness: 380, mass: 0.6 },
} as const;

export const hairlineWidth = StyleSheet.hairlineWidth;
