/**
 * Apple Design System — TypeScript Tokens
 *
 * Type-safe design tokens for the Apple HIG-inspired UI.
 * These mirror the CSS variables defined in index.css and tailwind.config.ts.
 */

// ─── Apple Color Tokens ───
export const appleColors = {
  blue:    { light: '#007AFF', dark: '#0A84FF' },
  green:   { light: '#34C759', dark: '#30D158' },
  indigo:  { light: '#5856D6', dark: '#5E5CE6' },
  orange:  { light: '#FF9500', dark: '#FF9F0A' },
  pink:    { light: '#FF2D55', dark: '#FF375F' },
  purple:  { light: '#AF52DE', dark: '#BF5AF2' },
  red:     { light: '#FF3B30', dark: '#FF453A' },
  teal:    { light: '#5AC8FA', dark: '#64D2FF' },
  yellow:  { light: '#FFCC00', dark: '#FFD60A' },
} as const;

// ─── Apple Gray Scale ───
export const appleGrays = {
  50:  '#F9FAFB',
  100: '#F2F2F7',
  200: '#E5E5EA',
  300: '#D1D1D6',
  400: '#C7C7CC',
  500: '#AEAEB2',
  600: '#8E8E93',
  700: '#636366',
  800: '#48484A',
  900: '#3A3A3C',
  950: '#2C2C2E',
} as const;

// ─── Apple Typography Scale ───
export const appleTypography = {
  caption2:   { size: '0.6875rem', lineHeight: '1rem',     letterSpacing: '-0.01em' },
  caption1:   { size: '0.75rem',   lineHeight: '1.125rem',  letterSpacing: '-0.01em' },
  footnote:   { size: '0.8125rem', lineHeight: '1.25rem',   letterSpacing: '-0.01em' },
  subhead:    { size: '0.9375rem', lineHeight: '1.375rem',  letterSpacing: '-0.02em' },
  body:       { size: '1rem',      lineHeight: '1.5rem',     letterSpacing: '-0.02em' },
  headline:   { size: '1.0625rem', lineHeight: '1.5rem',     letterSpacing: '-0.02em' },
  title3:     { size: '1.25rem',   lineHeight: '1.625rem',  letterSpacing: '-0.02em', weight: 600 },
  title2:     { size: '1.5rem',    lineHeight: '1.875rem',  letterSpacing: '-0.02em', weight: 600 },
  title1:     { size: '1.75rem',   lineHeight: '2.125rem',  letterSpacing: '-0.02em', weight: 700 },
  largeTitle: { size: '2rem',      lineHeight: '2.5rem',     letterSpacing: '-0.02em', weight: 700 },
} as const;

export type AppleTypographyScale = keyof typeof appleTypography;

// ─── Apple Border Radius ───
export const appleRadius = {
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '18px',
  '2xl': '22px',
  full: '9999px',
} as const;

// ─── Apple Shadow Scale ───
export const appleShadows = {
  sm:  '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
  md:  '0 2px 4px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.06)',
  lg:  '0 4px 8px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.04)',
  xl:  '0 8px 16px rgba(0,0,0,0.04), 0 16px 32px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.04)',
  focus: '0 0 0 3px rgba(0,122,255,0.3)',
} as const;

// ─── Apple Animation Durations ───
export const appleDurations = {
  instant: '100ms',
  fast:    '150ms',
  normal:  '250ms',
  slow:    '350ms',
  slower:  '500ms',
} as const;

// ─── Apple Easing Curves ───
export const appleEasing = {
  default: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce:  'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// ─── Apple Spacing Scale ───
export const appleSpacing = {
  xs:   '2px',
  sm:   '4px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '32px',
  '5xl': '48px',
} as const;

// ─── Glassmorphism Presets ───
export const appleGlass = {
  sidebar: {
    light: { bg: 'rgba(255,255,255,0.72)', border: 'rgba(255,255,255,0.18)', blur: '20px' },
    dark:  { bg: 'rgba(28,28,30,0.72)',    border: 'rgba(255,255,255,0.08)', blur: '20px' },
  },
  header: {
    light: { bg: 'rgba(255,255,255,0.72)', border: 'rgba(255,255,255,0.18)', blur: '20px' },
    dark:  { bg: 'rgba(28,28,30,0.72)',    border: 'rgba(255,255,255,0.08)', blur: '20px' },
  },
  modal: {
    light: { bg: 'rgba(255,255,255,0.85)', border: 'rgba(255,255,255,0.18)', blur: '40px' },
    dark:  { bg: 'rgba(44,44,46,0.85)',   border: 'rgba(255,255,255,0.08)', blur: '40px' },
  },
  card: {
    light: { bg: 'rgba(255,255,255,0.72)', border: 'rgba(255,255,255,0.18)', blur: '20px' },
    dark:  { bg: 'rgba(28,28,30,0.72)',    border: 'rgba(255,255,255,0.08)', blur: '20px' },
  },
} as const;

// ─── Helper: cn() integration ───
// These class names correspond to the Tailwind tokens defined above.
// Use them with the cn() utility for type-safe class composition:
//
//   import { cn } from '@/lib/utils';
//   import { appleRadius, appleDurations } from '@/lib/apple-tokens';
//
//   <div className={cn('shadow-apple-md rounded-apple-lg', className)} />
//
// All tokens are available as Tailwind classes with the `apple-` prefix:
//   - rounded-apple-sm / md / lg / xl / 2xl / full
//   - shadow-apple-sm / md / lg / xl / focus / focus-dark / glass / glass-dark
//   - text-apple-caption2 / caption1 / footnote / subhead / body / headline / title3 / title2 / title1 / large-title
//   - transition-apple with duration-apple-instant / fast / normal / slow / slower
//   - p-apple-xs / sm / md / lg / xl / 2xl / 3xl / 4xl / 5xl
//   - backdrop-blur-apple / apple-heavy / apple-ultra