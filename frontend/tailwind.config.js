/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta personalizada - Azul Tec de Monterrey (#0658a6)
        primary: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b8daff',
          300: '#7ebfff',
          400: '#3d9efc',
          500: '#0b7cde',
          600: '#0658a6',
          700: '#054a8c',
          800: '#043c72',
          900: '#032e58',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
