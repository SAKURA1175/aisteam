/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFA700', // Sun Yellow / Orange
          hover: '#FF9F1C',
          active: '#FFA700',
          shadow: '#E58E00',
        },
        secondary: {
          DEFAULT: '#FF7D54', // Peach Coral
          hover: '#FF6B3D',
          shadow: '#E55A2B',
        },
        danger: {
          DEFAULT: '#FF4B4B', // Retained for destructive actions
          hover: '#E53838',
          shadow: '#EA2B2B',
        },
        warning: {
          DEFAULT: '#FFD166', // Lighter Yellow
          hover: '#FFC843',
          shadow: '#E5AE20',
        },
        white: {
          DEFAULT: '#FFFFFF',
          hover: '#FFFBF5',
          shadow: '#E6DCC8',
        },
        neutral: {
          100: '#FFFBF5', // Warm Milk White
          200: '#F5EDDF',
          300: '#D4C8B8',
          400: '#8A7A66',
          500: '#5C4D3C', // Warm dark brown
        },
        background: {
          DEFAULT: '#FFFBF5',
          soft: '#F5EDDF',
        }
      },
      fontFamily: {
        display: ['"Feather Bold"', '"DIN Next Rounded"', 'Nunito', 'sans-serif'],
        sans: ['"DIN Next Rounded"', 'Nunito', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',      // 16px
        '2xl': '1.5rem',   // 24px
        '3xl': '2.5rem',   // 40px (More rounded for cute style)
        'full': '9999px',
      },
      boxShadow: {
        'juicy-primary': '0 6px 0 0 #E58E00',
        'juicy-primary-hover': '0 8px 0 0 #E58E00',
        'juicy-secondary': '0 6px 0 0 #E55A2B',
        'juicy-danger': '0 6px 0 0 #EA2B2B',
        'juicy-warning': '0 6px 0 0 #E5AE20',
        'juicy-white': '0 6px 0 0 #E6DCC8',
        'juicy-card': '0 4px 0 0 #E6DCC8, 0 8px 24px rgba(255, 167, 0, 0.15)',
      },
      animation: {
        'bounce-soft': 'bounce-soft 3s infinite ease-in-out',
        'float': 'float 6s infinite ease-in-out',
        'wobble': 'wobble 5s infinite ease-in-out',
      },
      keyframes: {
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(-3%)' },
          '50%': { transform: 'translateY(3%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-10px) rotate(-2deg)' },
          '75%': { transform: 'translateY(10px) rotate(2deg)' },
        },
        'wobble': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        }
      }
    },
  },
  plugins: [],
};


