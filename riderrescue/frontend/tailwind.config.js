/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F172A',      // Slate Black
        crimson: '#EF4444',  // Accent Crimson Red
        go: '#10B981',       // Emerald Green
      },
      fontFamily: {
        brand: ['"Abril Fatface"', 'Didot', 'Georgia', 'serif'],   // matches the logo wordmark
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
