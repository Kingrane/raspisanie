/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
                panel: 'rgb(var(--color-panel) / <alpha-value>)',
                cream: 'rgb(var(--color-cream) / <alpha-value>)',
                'cream-muted': 'rgb(var(--color-cream-muted) / <alpha-value>)',
                hairline: 'rgb(var(--color-hairline) / <alpha-value>)',
                green: 'rgb(var(--color-green) / <alpha-value>)',
                'green-light': 'rgb(var(--color-green-light) / <alpha-value>)',
                orange: 'rgb(var(--color-orange) / <alpha-value>)',
                pink: 'rgb(var(--color-pink) / <alpha-value>)',
                lilac: 'rgb(var(--color-lilac) / <alpha-value>)',
                blue: 'rgb(var(--color-blue) / <alpha-value>)',
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
