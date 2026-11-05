import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
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
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        canvas: "hsl(var(--canvas))",
        navy: {
          DEFAULT: "hsl(var(--navy))",
          2: "hsl(var(--navy-2))",
          soft: "hsl(var(--navy-soft))",
          acento: "hsl(var(--acento-sobre-navy))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        ui: ["var(--font-ui)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: { DEFAULT: "6px", sm: "4px", md: "6px", lg: "8px", xl: "12px", card: "12px" },
      boxShadow: {
        card: "0 1px 2px rgba(10, 23, 48, 0.05), 0 1px 3px rgba(10, 23, 48, 0.04)",
        elevada: "0 4px 14px rgba(10, 23, 48, 0.08), 0 1px 3px rgba(10, 23, 48, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
