/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../libs/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#03111c',
        foreground: '#e6f0f7',

        card: '#061a28',
        cardForeground: '#e6f0f7',

        border: '#0b2538',
        muted: '#8fa3b8',

        primary: '#fbff3a',
        primaryForeground: '#03111c',

        accent: '#fbff3a',
        accentForeground: '#03111c',
      },
    },
  },
  plugins: [],
};
