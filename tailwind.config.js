/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Custom brand colors for consistency
                brand: {
                    DEFAULT: '#14b8a6', // teal-500
                    dark: '#0d9488',    // teal-600
                    light: '#2dd4bf',   // teal-400
                },
            },
        },
    },
    plugins: [],
}
