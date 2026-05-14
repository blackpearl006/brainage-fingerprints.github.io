/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper:  "#FAF7F2",
        paper2: "#F0EDE5",
        ink:    "#1A2332",
        ink2:   "#5A6478",
        rule:   "#2A3245",
        accent: "#E89B2C",
        sig:    "#C8312B",
      },
      fontFamily: {
        sans:  ["Sora", "sans-serif"],
        serif: ["Newsreader", "serif"],
        mono:  ["JetBrains Mono", "monospace"],
      },
      maxWidth: {
        prose: "62ch",
        wide:  "76rem",
      },
    },
  },
  plugins: [],
};
