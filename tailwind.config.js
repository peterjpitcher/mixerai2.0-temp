/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  safelist: ['ql-editor', 'ql-snow', 'ql-section'],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        neutral: {
          50: "#F5F7FA",  
          100: "#E4E7EB",
          200: "#CBD2D9",
          300: "#9AA5B1",
          400: "#7B8794",
          500: "#616E7C",
          600: "#52606D",
          700: "#3E4C59",
          800: "#323F4B",
          900: "#1F2933",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        error: "hsl(var(--destructive))",
        highlight: "hsl(var(--highlight))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    function({ addBase, theme }) {
      addBase({
        '.ql-editor': {
          '@apply prose prose-lg prose-slate dark:prose-invert max-w-none': {},
          padding: theme('spacing.6'),
          fontFamily: (() => {
            const sans = theme('fontFamily.sans');
            if (Array.isArray(sans)) {
              return sans.join(',');
            }
            if (typeof sans === 'string') {
              return sans;
            }
            // Fallback if theme('fontFamily.sans') is not an array or string
            return 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
          })(),
          minHeight: theme('spacing.72'), 
        },
        '.ql-editor p': {
          '@apply mb-4 leading-relaxed': {},
        },
        '.ql-editor h1':  { '@apply text-4xl font-bold mt-12 mb-4': {} },
        '.ql-editor h2':  { '@apply text-3xl font-semibold mt-10 mb-4': {} },
        '.ql-editor h3':  { '@apply text-2xl font-semibold mt-8 mb-3': {} },
        '.ql-editor ul, .ql-editor ol': {
          '@apply my-6 pl-6': {},
        },
        '.ql-editor li': {
          '@apply mb-2': {},
        },
        '.ql-editor blockquote': {
          '@apply border-l-4 pl-4 italic mb-6 text-gray-600 dark:text-gray-400': {},
          borderColor: theme('colors.neutral.300'),
        },
        '.ql-editor pre': {
          '@apply bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 mb-6 overflow-auto': {},
        },
        '.ql-editor code': {
          '@apply font-mono text-sm px-1 bg-neutral-100 dark:bg-neutral-800 rounded': {},
        },
      });
    }
  ],
} 