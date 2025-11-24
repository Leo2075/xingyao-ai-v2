import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB', // 更深邃的科技蓝
        'primary-hover': '#1D4ED8',
        'tech-dark': '#0F172A', // Slate 900
        'tech-gray': '#F8FAFC', // Slate 50
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'float': '0 10px 30px -10px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 15px rgba(37, 99, 235, 0.2)',
      },
    },
  },
  plugins: [],
}
export default config
