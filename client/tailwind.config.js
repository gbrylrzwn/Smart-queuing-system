/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}", // סורק את כל קובצי ה-TypeScript וה-React
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Rubik', 'Varela Round', 'Segoe UI', 'sans-serif'],

        },
        colors: {
          // צבעי פרימיום מותאמים ל-SmartQueue
          brand: {
            50: '#f0f7ff',
            100: '#e0effe',
            500: '#3b82f6', // כחול ראשי
            600: '#2563eb',
            700: '#1d4ed8',
          },
        },
      },
    },
    plugins: [],
  }
  
  