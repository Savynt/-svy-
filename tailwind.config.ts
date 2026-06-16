import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand navy — from the SVY book logo
        navy: {
          50: '#eef4f9',
          100: '#d6e4f0',
          200: '#aecbe1',
          300: '#7fa9cb',
          400: '#5183af',
          500: '#356391',
          600: '#274d75',
          700: '#1e3a5f', // primary brand
          800: '#172d4a',
          900: '#101f34',
          950: '#0a1422',
        },
        sky: {
          50: '#f5f9fc',
          100: '#e8f1f8',
          200: '#cfe2ee', // logo plate
          300: '#b4d2e4',
        },
        accent: {
          400: '#f2b950',
          500: '#e7a531',
          600: '#c9881f',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-jakarta)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,31,52,0.04), 0 8px 24px rgba(16,31,52,0.06)',
        'card-hover': '0 2px 4px rgba(16,31,52,0.06), 0 16px 40px rgba(16,31,52,0.12)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
      },
    },
  },
  plugins: [],
}

export default config
