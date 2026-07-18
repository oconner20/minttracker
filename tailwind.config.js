/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  // สแกนหา class จากทั้ง HTML และ JS (class ที่สร้างตอน runtime อยู่ในสตริงของ js/app.js)
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf',
          500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a'
        }
      }
    }
  },
  plugins: []
};
