/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gmail: {
          bg: '#f6f8fc',
          surface: '#ffffff',
          sidebarActive: '#d3e3fd',
          composeBtn: '#c2e7ff',
          composeBtnHover: '#b3dbf5',
          searchBg: '#eaf1fb',
          searchFocusBg: '#ffffff',
          hoverRow: '#f2f6fc',
          border: '#e1e3e1',
          textMain: '#1f1f1f',
          textMuted: '#444746',
          textSub: '#5e5e5e',
          accent: '#0b57d0',
          starYellow: '#e37400',
          unreadBg: '#ffffff',
          readBg: '#f2f6fc',
        }
      },
      fontFamily: {
        sans: ['Google Sans', 'Roboto', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
