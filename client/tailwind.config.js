/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        primary: '#ea580c',
        secondary: '#f97316',
        accent: '#eab308',
        surface: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #eab308 100%)',
        'gradient-blue': 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #eab308 100%)',
        'gradient-hero': 'linear-gradient(140deg, #ea580c 0%, #f97316 50%, #eab308 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'counter': 'counter 2s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      boxShadow: {
        'card': '0 8px 24px -14px rgba(15,23,42,0.18), 0 4px 10px -8px rgba(15,23,42,0.12)',
        'card-hover': '0 20px 45px -20px rgba(15,23,42,0.28), 0 10px 18px -14px rgba(15,23,42,0.15)',
        'navy': '0 14px 36px -18px rgba(234,88,12,0.6)',
        'blue': '0 14px 36px -18px rgba(249,115,22,0.55)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'soft': '0 20px 40px -24px rgba(15, 23, 42, 0.25)',
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
