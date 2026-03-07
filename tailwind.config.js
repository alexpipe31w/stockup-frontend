/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { blue: '#2563eb', purple: '#9333ea' },
      },
    },
  },
  plugins: [],
};
