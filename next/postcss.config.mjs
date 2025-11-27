/**
 * @fileoverview PostCSS configuration file for processing CSS, typically used 
 * alongside Tailwind CSS to handle styling and vendor prefixing.
 */

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // 1. Tailwind CSS is run first to generate all utility classes.
    tailwindcss: {},
    
    // 2. Autoprefixer is run afterward to add vendor prefixes (e.g., -webkit-, -moz-) 
    //    to the generated CSS for broader browser compatibility. This is a critical 
    //    best practice for production builds.
    autoprefixer: {},
  },
};

// Use ES module syntax for exporting the configuration.
export default config;
