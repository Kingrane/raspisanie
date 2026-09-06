import React from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ theme, onToggle, className = '' }) => {
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={onToggle}
            className={`pill theme-toggle !p-0 !w-9 !h-9 flex items-center justify-center shrink-0 relative overflow-hidden transition-transform duration-200 active:scale-90 select-none ${className}`}
            title={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
            aria-label={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
        >
            {/* Солнце (светлая тема) */}
            <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform will-change-transform ${
                    isDark
                        ? 'rotate-90 scale-0 opacity-0 pointer-events-none'
                        : 'rotate-0 scale-100 opacity-100 text-orange'
                }`}
            >
                <Sun size={17} className="stroke-[2.2]" />
            </div>

            {/* Луна (тёмная тема) */}
            <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform will-change-transform ${
                    isDark
                        ? 'rotate-0 scale-100 opacity-100 text-cream'
                        : '-rotate-90 scale-0 opacity-0 pointer-events-none'
                }`}
            >
                <Moon size={16} className="stroke-[2.2]" />
            </div>
        </button>
    );
};

export default ThemeToggle;
