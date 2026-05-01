/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e8e7f7',
          100: '#c5c3ec',
          200: '#9e9bdf',
          300: '#7773d2',
          400: '#5955c8',
          500: '#534AB7',
          600: '#3b339f',
          700: '#2a2480',
          800: '#1a1561',
          900: '#080344',
          950: '#04021f',
        },
        navy: '#080344',
        purple: '#534AB7',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}
