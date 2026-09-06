import React from 'react';

const WeekToggle = ({ currentWeek, onChange }) => {
    const options = [
        { value: 'all', label: 'Все' },
        { value: 'upper', label: 'Верхняя' },
        { value: 'lower', label: 'Нижняя' },
    ];

    return (
        <div className="flex gap-2">
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`pill !py-2 !px-4 !text-[13px] ${
                        currentWeek === opt.value ? 'pill-active' : ''
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};

export default WeekToggle;
