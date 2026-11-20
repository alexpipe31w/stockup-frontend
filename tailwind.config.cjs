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
        // Stockup landing tokens
        stockup: {
          bg: '#0A0A0F',
          card: '#111117',
          secondary: '#0d0d14',
          lime: '#D4FF00',
          'lime-dark': '#1f3d1f',
          'chat-client': '#1c1c2a',
        },
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
        'glow-lime': '0 0 30px rgba(212,255,0,0.08), 0 0 60px rgba(212,255,0,0.04)',
        'glow-lime-lg': '0 0 40px rgba(212,255,0,0.06)',
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
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'shimmer-sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'orb-1': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(60px, -40px)' },
          '66%': { transform: 'translate(-30px, 30px)' },
        },
        'orb-2': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(-50px, 30px)' },
          '66%': { transform: 'translate(40px, -20px)' },
        },
        'typing-dot': {
          '0%, 60%, 100%': { transform: 'scale(0)' },
          '30%': { transform: 'scale(1)' },
        },
        'shadow-pulse': {
          '0%, 100%': { boxShadow: '0 20px 60px rgba(212,255,0,0.1)' },
          '50%': { boxShadow: '0 20px 60px rgba(212,255,0,0.2)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.2s ease-out forwards',
        'spin-loader': 'spin-loader 0.8s linear infinite',
        float: 'float 4s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'shimmer-sweep': 'shimmer-sweep 3s ease-in-out infinite',
        'orb-1': 'orb-1 25s ease-in-out infinite',
        'orb-2': 'orb-2 20s ease-in-out infinite',
        'typing-dot': 'typing-dot 0.6s ease-in-out infinite',
        'shadow-pulse': 'shadow-pulse 4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
