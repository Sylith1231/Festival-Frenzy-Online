/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        sun: '#fcdb36',
      },
    },
  },
  //TODO remove preflight when appropriate (removes tailwind default styling)
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
