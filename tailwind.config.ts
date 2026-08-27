import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      colors: {
        brand: { DEFAULT: "#2B4BDF", deep: "#1D33AC", soft: "#EDF1FE" },
        violet2: { DEFAULT: "#7C5CFC", soft: "#F1EDFF" },
        teal2: { DEFAULT: "#14B8A6", deep: "#0E8C7F", soft: "#E7F8F5" },
        alert: { DEFAULT: "#E5484D", soft: "#FDEDED" },
        ink: "#0C1338",
        body: "#3F4869",
        muted: "#6C7491",
        page: "#F6F7FB",
        pagealt: "#EFF1F8",
        line: "#E4E7F1",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "brand-gradient": "linear-gradient(135deg, #2B4BDF 0%, #7C5CFC 100%)",
        "mesh-gradient":
          "linear-gradient(120deg, rgba(43,75,223,0.08), rgba(124,92,252,0.08), rgba(20,184,166,0.08))",
      },
      boxShadow: {
        card: "0 2px 8px rgba(12,19,56,0.05), 0 8px 24px rgba(12,19,56,0.06)",
        lift: "0 6px 20px rgba(12,19,56,0.08), 0 16px 40px rgba(12,19,56,0.08)",
        glow: "0 8px 28px rgba(43,75,223,0.32)",
      },
    },
  },
  plugins: [],
};
export default config;
