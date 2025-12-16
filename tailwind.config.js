/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        'blue-bg': '#ebf8ff',
        'blue-border': '#bfdbfe',
        'blue-title': '#1d4ed8',
        'green-bg': '#ecfdf3',
        'green-border': '#bbf7d0',
        'green-title': '#15803d',
        'config-bg': '#fff7ed',
        'config-border': '#fed7aa',
        'config-title': '#c2410c',
        'border': '#e2e8f0',
        'row-alt': '#f7fafc',
        'row-hover': '#edf2f7',
        'primary': '#2563eb',
        'secondary': '#e5e7eb',
        'danger': '#dc2626',
        'purple': '#a855f7',
        'dark': '#0f172a',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(0,0,0,.1)',
        'md': '0 4px 10px rgba(0,0,0,.12)',
        'lg': '0 8px 24px rgba(0,0,0,.18)',
      },
    },
  },
  corePlugins: {
    preflight: false, // manter o CSS existente como base
  },
  plugins: [],
};
