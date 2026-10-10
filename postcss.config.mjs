// Tailwind CSS 4 through PostCSS. The @tailwindcss/turbopack loader rule the scaffold ships matches
// *.module.css too and flattens CSS Modules into global CSS, so we use the PostCSS plugin instead.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
