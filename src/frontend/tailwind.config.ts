import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: { extend: {} },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["night"],
    darkTheme: "night",
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
};
export default config;
