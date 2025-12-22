/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#58a6ff', // Cyan/electric blue for accents
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        accent: {
          purple: {
            light: '#8b5cf6',
            DEFAULT: '#6e40c9', // Deep purple for AI button
            dark: '#5b21b6',
          },
          pink: {
            light: '#f472b6',
            DEFAULT: '#ec4899',
            dark: '#db2777',
          },
          cyan: {
            light: '#7dd3fc',
            DEFAULT: '#58a6ff', // Electric blue for progress bars
            dark: '#0891b2',
          },
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          150: '#eeeeee',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          850: '#1a1a1a',
          900: '#171717',
          950: '#0a0a0a',
        },
        dark: {
          bg: {
            primary: '#0d1117',    // Very dark navy/charcoal - main background
            secondary: '#161b22',  // Dark navy - cards and nav
            tertiary: '#1a2332',   // Dark navy - alternative
            surface: '#0f1419',    // Very dark for surfaces
          },
          navy: {
            light: '#2a3f5f',      // Light navy for gradients
            DEFAULT: '#1e2a3a',    // Deep navy for gradients
            dark: '#1a2332',       // Dark navy
            darker: '#0f1419',     // Darker navy
          },
          border: {
            glow: '#3a4f6a',       // Subtle border glow/rim lighting
            subtle: '#30363d',     // Subtle borders
          },
          text: {
            primary: '#e6edf3',    // Light gray/off-white - main text
            secondary: '#c9d1d9',  // Secondary text
            muted: '#8b949e',      // Muted text
          },
          subject: {
            chemistry: '#2d1a28',  // Dark burgundy/wine
            english: '#2d2416',    // Dark amber/bronze
            math: '#1a2d2d',       // Dark teal
            physics: '#1d2a1d',    // Dark green
            history: '#2d2116',    // Dark bronze
          },
        },
        // Opal-inspired colors for Focus Mode
        opal: {
          purple: {
            DEFAULT: '#4E30BD',    // Deep purple primary
            light: '#7C5CFF',      // Light purple
            glow: 'rgba(78, 48, 189, 0.4)',  // Glow effect
          },
          cyan: {
            DEFAULT: '#A0FFF9',    // Vibrant cyan accent
            muted: 'rgba(160, 255, 249, 0.6)',  // Muted cyan
          },
          bg: '#0D0D0F',           // Pure black background
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.625rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9))',
        'glass-dark': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'soft-md': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        'soft-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
        // Dark theme shadows
        'dark-soft': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'dark-soft-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'dark-soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
        'dark-inner': 'inset 0 1px 3px 0 rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      maxWidth: {
        'desktop': '1600px',      // Ultra-wide desktop
        'desktop-lg': '1400px',    // Large desktop
        'desktop-md': '1200px',    // Medium desktop
        'desktop-content': '1000px',
        'desktop-card': '600px',
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-out',
        'fadeInUp': 'fadeInUp 0.4s ease-out',
        'slideUp': 'slideUp 0.3s ease-out',
        'slideDown': 'slideDown 0.3s ease-out',
        'scaleIn': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Opal animations
        'opal-pulse': 'opal-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'opal-breathe': 'opal-breathe 4s ease-in-out infinite',
        'opal-card-enter': 'opalCardEnter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'opal-gradient': 'opalGradient 3s linear infinite',
        // Glass morphism float animation
        'float': 'float 6s ease-in-out infinite',
        // Enhanced micro-interactions
        'bounce-soft': 'bounceSoft 1s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'glow': 'glow 2s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        // Stagger animations
        'stagger-fade-in': 'fadeIn 0.5s ease-out backwards',
        // Flying away animation for completed tasks
        'fly-away': 'flyAway 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        // Emoji transition animations
        'emoji-exit': 'emojiExit 3.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'emoji-enter': 'emojiEnter 3.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'bounce-slow': 'bounceSlow 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        // Opal keyframes
        'opal-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(78, 48, 189, 0.4)', transform: 'scale(1)' },
          '50%': { boxShadow: '0 0 40px rgba(124, 92, 255, 0.5)', transform: 'scale(1.02)' },
        },
        'opal-breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
        },
        'opalCardEnter': {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'opalGradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        // Glass morphism float animation
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        // Enhanced micro-interactions
        'bounceSoft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-5deg)' },
          '75%': { transform: 'rotate(5deg)' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(88, 166, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(88, 166, 255, 0.6)' },
        },
        'slideInRight': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slideInLeft': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Flying away animation for completed tasks
        'flyAway': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '50%': { transform: 'translateY(-30px) scale(1.05)', opacity: '0.8' },
          '100%': { transform: 'translateY(-100px) scale(0.8)', opacity: '0' },
        },
        // Emoji transition animations
        'emojiExit': {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-30px) scale(0.5)' },
        },
        'emojiEnter': {
          '0%': { opacity: '0', transform: 'translateY(30px) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'bounceSlow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}
