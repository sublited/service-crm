/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14181f",
        paper: "#fbfaf8",
        brand: {
          50: "#f0f7f5",
          100: "#d9ece6",
          400: "#4fa090",
          500: "#357c6f",
          600: "#28655a",
          700: "#204f47",
        },
        clay: "#c96a4c",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        sans: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
