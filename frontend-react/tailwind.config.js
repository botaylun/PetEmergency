/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff4757',
          light: '#ff6b81',
          dark: '#e84118'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Montserrat', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
