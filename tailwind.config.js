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
          DEFAULT: '#58a6ff',
          hover: '#79b8ff',
        },
        surface: {
          base: '#0d1117',
          elevated: '#161b22',
          overlay: '#21262d',
        },
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          muted: '#6e7681',
        },
        border: {
          DEFAULT: '#30363d',
          active: '#58a6ff',
        },
        success: '#3fb950',
        warning: '#d29922',
        error: '#f85149',
        accent: '#a78bfa',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'elevated': '0 4px 12px -2px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
