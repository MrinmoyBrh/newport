/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Portfolio V2 Primary & Supporting Palette
        espresso: {
          deep: '#1D1511',
          DEFAULT: '#2B1D16',
          surface: '#2B1D16',
          light: '#36251C',
        },
        oat: {
          DEFAULT: '#E9DFCF',
          muted: '#C9BFAF',
          light: '#F5EFE6',
          dark: '#A89F90',
        },
        sage: {
          DEFAULT: '#9CAF88',
          hover: '#B1C2A0',
          light: '#C4D3B6',
          dark: '#7A8C67',
          glow: 'rgba(156, 175, 136, 0.25)',
        },
        warmBrown: {
          DEFAULT: '#403027',
          deep: '#33261F',
          light: '#523E33',
          border: 'rgba(233, 223, 207, 0.12)',
        },

        // Backward compatibility mappings so existing template references transition to V2
        ink: {
          950: '#150F0C',
          DEFAULT: '#1D1511',
          900: '#1D1511',
          800: '#2B1D16',
          700: '#36251C',
          600: '#403027',
        },
        pearl: {
          50: '#FFFFFF',
          DEFAULT: '#E9DFCF',
          100: '#F5EFE6',
          200: '#E9DFCF',
          300: '#C9BFAF',
        },
        coral: {
          DEFAULT: '#9CAF88',
          hover: '#B1C2A0',
          light: '#C4D3B6',
          glow: 'rgba(156, 175, 136, 0.28)',
        },
        cherry: {
          DEFAULT: '#9CAF88',
          hover: '#B1C2A0',
          light: '#C4D3B6',
          glow: 'rgba(156, 175, 136, 0.28)',
        },
        smoke: {
          DEFAULT: '#C9BFAF',
          light: '#E9DFCF',
          dark: '#8C8173',
          muted: '#5A5046',
        },
        orbital: {
          DEFAULT: '#9CAF88',
          hover: '#B1C2A0',
          light: '#C4D3B6',
          glow: 'rgba(156, 175, 136, 0.25)',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
        brush: ['"Neoradical Brush Lettering"', 'cursive', 'sans-serif'],
        manrope: ['"Manrope"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serifBody: ['"Manrope"', 'sans-serif'],
        script: ['"Royale Amoure Script"', 'cursive', 'serif'],
      },
      animation: {
        'orbit-slow': 'orbit 60s linear infinite',
        'orbit-mid': 'orbit 38s linear infinite reverse',
        'orbit-fast': 'orbit 22s linear infinite',
        'pulse-subtle': 'pulseGlow 4s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'cloud-drift': 'cloudDrift 28s ease-in-out infinite alternate',
      },
      keyframes: {
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.04)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        cloudDrift: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(30px, -20px) scale(1.06)' },
          '100%': { transform: 'translate(-20px, 20px) scale(0.98)' },
        },
      },
      boxShadow: {
        'glow-sage': '0 0 25px -4px rgba(156, 175, 136, 0.35)',
        'glow-coral': '0 0 25px -4px rgba(156, 175, 136, 0.35)',
        'glow-orbital': '0 0 25px -4px rgba(156, 175, 136, 0.35)',
        'surface-elevated': '0 12px 36px -8px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(233, 223, 207, 0.08)',
        'warm-card': '0 10px 30px -10px rgba(29, 21, 17, 0.5), 0 0 0 1px rgba(233, 223, 207, 0.1)',
        'warm-card-hover': '0 16px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(156, 175, 136, 0.35)',
      },
    },
  },
  plugins: [],
};
