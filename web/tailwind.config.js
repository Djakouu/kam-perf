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
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#dae995', // Main Primary
          600: '#dae995',
          700: '#c4d385',
          800: '#2C5D52',
          900: '#365314',
        },
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6', // Page BG
          200: '#e5e7eb', // Borders
          300: '#d1d5db',
          400: '#9ca3af', // Secondary Text
          500: '#6b7280',
          600: '#4b5563', // Primary Text
          700: '#374151',
          800: '#1f2937', // Headings
          900: '#111827',
        },
        status: {
          good: '#10B981',    // <= 500ms
          warning: '#F59E0B', // 500-1000ms
          danger: '#EF4444',  // 1000-2000ms
          critical: '#991B1B' // > 2000ms
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}

