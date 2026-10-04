/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fredoka', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: '#FDF6EC',
        ink: '#2D3436',
        brand: {
          50: '#F0EDFF',
          100: '#E2DDFF',
          200: '#C7BDFF',
          300: '#A796FF',
          400: '#8B74FE',
          500: '#7C5CFC',
          600: '#6842E8',
          700: '#5432C4',
          800: '#4329A0',
          900: '#35217D',
        },
        mint: { 400: '#3ED9A4', 500: '#00B894', 600: '#009977' },
        sun: { 300: '#FFE28A', 400: '#FFD35C', 500: '#FDCB6E' },
        coral: { 400: '#FF8FA3', 500: '#FD79A8', 600: '#E84E86' },
        sky: { 400: '#4FA8F8', 500: '#0984E3', 600: '#0768B4' },
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '70%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-80px)', opacity: '0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        fall: {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0' },
        },
      },
      animation: {
        pop: 'pop 0.25s ease-out both',
        shake: 'shake 0.45s ease-in-out',
        'float-up': 'float-up 1s ease-out forwards',
        wiggle: 'wiggle 1.2s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.5s ease-out both',
        fall: 'fall 2.6s linear forwards',
      },
    },
  },
  plugins: [],
};
