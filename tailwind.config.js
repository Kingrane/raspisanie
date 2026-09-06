/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                canvas: '#0e100f',
                panel: '#191919',
                cream: '#fffce1',
                'cream-muted': '#7c7c6f',
                hairline: '#42433d',
                green: '#0ae448',
                'green-light': '#abff84',
                orange: '#ff8709',
                pink: '#fec5fb',
                lilac: '#9d95ff',
                blue: '#00bae2',
            },
            fontFamily: {
                sans: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
            },
            letterSpacing: {
                display: '-0.02em',
                tightest: '-0.011em',
            },
        },
    },
    plugins: [],
}
