/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        poppins: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
        inter: ['var(--font-inter)', 'Inter', 'sans-serif'],
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        /* Althea System – couleurs métier */
        althea: {
          cta:     '#00a8b5',
          bg:      '#d4f4f7',
          hover:   '#33bfc9',
          dark:    '#003d5c',
          success: '#10b981',
          error:   '#ef4444',
          warning: '#F59E0B',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 20px rgba(0,168,181,0.12)' },
          '50%': { boxShadow: '0 0 40px rgba(0,168,181,0.4), 0 0 80px rgba(0,168,181,0.12)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        slide3dEnter: {
          '0%': { opacity: '0', transform: 'perspective(1400px) rotateX(10deg) translateY(40px) scale(0.93)' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'perspective(1400px) rotateX(0deg) translateY(0) scale(1)' },
        },
        slideTextEnter: {
          '0%': { opacity: '0', transform: 'translateX(-36px) translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0) translateY(0)' },
        },
        revealUp: {
          '0%': { opacity: '0', transform: 'translateY(32px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'float-delay': 'float 7s ease-in-out 2s infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        'fade-in-up': 'fadeInUp 0.7s ease-out forwards',
        scanline: 'scanline 8s linear infinite',
        'slide-3d': 'slide3dEnter 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'slide-text': 'slideTextEnter 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'reveal-up': 'revealUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
      boxShadow: {
        glow: '0 0 20px rgba(0,168,181,0.25), 0 0 60px rgba(0,168,181,0.06)',
        'glow-lg': '0 0 40px rgba(0,168,181,0.4), 0 0 100px rgba(0,168,181,0.12)',
        'glow-inner': 'inset 0 0 30px rgba(0,168,181,0.06)',
        glass: '0 8px 32px rgba(0,61,92,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
