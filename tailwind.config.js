/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:       'var(--color-primary)',
        'primary-dark':'var(--color-primary-dark)',
        'primary-light':'var(--color-primary-light)',
        secondary:     'var(--color-secondary)',
        accent:        'var(--color-accent)',
      },
    },
  },
  plugins: [],
};
