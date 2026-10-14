/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Vos couleurs primaires existantes
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Ajout de la couleur verte de l'école (une seule teinte)
        'school-green': {
          DEFAULT: '#00CE7b',
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20',
        },
        // Ajout de couleurs secondaires pour votre charte
        'school-dark': '#1a2a3a',
        'school-gold': '#c9a84c',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  // ============================================================
  // SAFELIST — classes construites dynamiquement (échéanciers TFH)
  // Sans ça, les classes comme bg-purple-50 construites à la volée
  // ne sont PAS générées par le JIT de Tailwind.
  // ============================================================
  safelist: [
    {
      // Toutes les nuances utilisées par EcheancierTimeline
      pattern: /(bg|text|border)-(violet|purple|blue|green|orange|red|amber|emerald|sky|indigo|rose|teal|cyan|fuchsia|pink|lime|yellow|gray)-(50|100|200|300|400|500|600|700|800|900)/,
    },
  ],
  plugins: [],
};