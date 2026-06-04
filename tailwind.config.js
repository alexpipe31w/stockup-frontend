/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0A0A0F',
        surface: {
          DEFAULT: '#141419',
          elevated: '#1C1C24',
          overlay: '#24242E',
        },
        'border-subtle': '#1E1E28',
        'border-default': '#2A2A36',
        txt: {
          primary: '#F0F0F5',
          secondary: '#8A8A9A',
          tertiary: '#5A5A6A',
          disabled: '#3A3A4A',
          inverse: '#0A0A0F',
        },
        lime: {
          DEFAULT: '#D4FF00',
          hover: '#E0FF40',
          pressed: '#B8E600',
          subtle: 'rgba(212, 255, 0, 0.08)',
          medium: 'rgba(212, 255, 0, 0.15)',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        whatsapp: '#25D366',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.3)',
        md: '0 4px 12px rgba(0,0,0,0.4)',
        lg: '0 8px 24px rgba(0,0,0,0.5)',
        xl: '0 16px 48px rgba(0,0,0,0.6)',
        accent: '0 0 20px rgba(212,255,0,0.15)',
        'accent-lg': '0 0 40px rgba(212,255,0,0.2)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(212,255,0,0.15)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 30px rgba(212,255,0,0.25)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spin-loader': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.2s ease-out forwards',
        'spin-loader': 'spin-loader 0.8s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
