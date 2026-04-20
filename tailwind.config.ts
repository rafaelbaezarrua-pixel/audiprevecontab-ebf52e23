import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // ─── Tipografia Apple ───
      fontFamily: {
        sans: [
          'Ubuntu',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'Ubuntu',
          'monospace',
        ],
        // Aliases semânticos (mantêm compatibilidade com o existente)
        ubuntu: [
          'Ubuntu',
          'sans-serif',
        ],
        montserrat: [
          'Ubuntu',
          'sans-serif',
        ],
        title: [
          'Ubuntu',
          'sans-serif',
        ],
        body: [
          'Ubuntu',
          'sans-serif',
        ],
      },

      // ─── Paleta Apple Completa ───
      colors: {
        // Cores semânticas (mantêm compatibilidade com Shadcn existente)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--primary-dark))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
        },

        // Tokens Apple — cores explícitas
        apple: {
          blue: {
            DEFAULT: '#007AFF',
            dark: '#0A84FF',
          },
          green: {
            DEFAULT: '#34C759',
            dark: '#30D158',
          },
          indigo: {
            DEFAULT: '#5856D6',
            dark: '#5E5CE6',
          },
          orange: {
            DEFAULT: '#FF9500',
            dark: '#FF9F0A',
          },
          pink: {
            DEFAULT: '#FF2D55',
            dark: '#FF375F',
          },
          purple: {
            DEFAULT: '#AF52DE',
            dark: '#BF5AF2',
          },
          red: {
            DEFAULT: '#FF3B30',
            dark: '#FF453A',
          },
          teal: {
            DEFAULT: '#5AC8FA',
            dark: '#64D2FF',
          },
          yellow: {
            DEFAULT: '#FFCC00',
            dark: '#FFD60A',
          },
          // Surfaces Apple
          gray: {
            50: '#F9FAFB',
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
          },
        },
      },

      // ─── Tipografia Apple ───
      fontSize: {
        'apple-caption2': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '-0.01em' }],
        'apple-caption1': ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '-0.01em' }],
        'apple-footnote': ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '-0.01em' }],
        'apple-subhead': ['0.9375rem', { lineHeight: '1.375rem', letterSpacing: '-0.02em' }],
        'apple-body': ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.02em' }],
        'apple-headline': ['1.0625rem', { lineHeight: '1.5rem', letterSpacing: '-0.02em' }],
        'apple-title3': ['1.25rem', { lineHeight: '1.625rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        'apple-title2': ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        'apple-title1': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'apple-large-title': ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em', fontWeight: '700' }],
      },

      // ─── Bordas Arredondadas Apple ───
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) * 1.5)",
        '2xl': "calc(var(--radius) * 2)",
        '3xl': "calc(var(--radius) * 3)",
        // Tokens Apple
        'apple-sm': '6px',
        'apple-md': '10px',
        'apple-lg': '14px',
        'apple-xl': '18px',
        'apple-2xl': '22px',
        'apple-full': '9999px',
      },

      // ─── Sombras Multicamada Apple ───
      boxShadow: {
        // Sombras legadas (mantêm compatibilidade)
        'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'premium-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
        // Tokens Apple
        'apple-sm': '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'apple-md': '0 2px 4px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.06)',
        'apple-lg': '0 4px 8px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.06), 0 16px 32px rgba(0, 0, 0, 0.04)',
        'apple-xl': '0 8px 16px rgba(0, 0, 0, 0.04), 0 16px 32px rgba(0, 0, 0, 0.06), 0 24px 48px rgba(0, 0, 0, 0.04)',
        'apple-focus': '0 0 0 3px rgba(0, 122, 255, 0.3)',
        'apple-focus-dark': '0 0 0 3px rgba(10, 132, 255, 0.4)',
        // Glassmorphism
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
        'glass-dark': '0 4px 30px rgba(0, 0, 0, 0.3)',
        // Elevation system
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'elevation-2': '0 3px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.08)',
        'elevation-3': '0 6px 12px rgba(0, 0, 0, 0.05), 0 3px 6px rgba(0, 0, 0, 0.08)',
        'elevation-4': '0 12px 24px rgba(0, 0, 0, 0.05), 0 6px 12px rgba(0, 0, 0, 0.08)',
      },

      // ─── Transições Apple ───
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'apple-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'apple-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
        75: '75ms',
        100: '100ms',
        150: '150ms',
        200: '200ms',
        300: '300ms',
        500: '500ms',
        700: '700ms',
        1000: '1000ms',
        // Tokens Apple
        'apple-instant': '100ms',
        'apple-fast': '150ms',
        'apple-normal': '250ms',
        'apple-slow': '350ms',
        'apple-slower': '500ms',
      },

      // ─── Backdrop Blur (Glassmorphism) ───
      backdropBlur: {
        'apple': '20px',
        'apple-heavy': '40px',
        'apple-ultra': '60px',
      },

      backdropSaturate: {
        'apple': '1.8',
        'apple-heavy': '2',
      },

      // ─── Keyframes ───
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Animações Apple
        "apple-fade-in": {
          from: { opacity: "0", transform: "scale(0.98) translateY(4px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "apple-slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "apple-slide-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "apple-scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "apple-pop": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "70%": { transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "apple-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.05s ease-out",
        "accordion-up": "accordion-up 0.05s ease-out",
        "fade-in": "fade-in 0.05s ease-out",
        // Animações Apple
        "apple-fade-in": "apple-fade-in 250ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        "apple-slide-up": "apple-slide-up 300ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        "apple-slide-down": "apple-slide-down 300ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        "apple-scale-in": "apple-scale-in 200ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        "apple-pop": "apple-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        "apple-shimmer": "apple-shimmer 2s infinite linear",
      },

      // ─── Spacing Apple ───
      spacing: {
        'apple-xs': '2px',
        'apple-sm': '4px',
        'apple-md': '8px',
        'apple-lg': '12px',
        'apple-xl': '16px',
        'apple-2xl': '20px',
        'apple-3xl': '24px',
        'apple-4xl': '32px',
        'apple-5xl': '48px',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;