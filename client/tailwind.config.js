/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-purple': '#46178f',
                'brand-dark': '#25076b',
                'kahoot-red': '#e21b3c',
                'kahoot-blue': '#1368ce',
                'kahoot-yellow': '#d89e00',
                'kahoot-green': '#26890c',
            }
        },
    },
    plugins: [],
}
