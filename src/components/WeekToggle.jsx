import React from 'react';

const WeekToggle = ({ currentWeek, onChange }) => {
    const options = [
        { value: 'all', label: 'Все' },
        { value: 'upper', label: 'Верхняя' },
        { value: 'lower', label: 'Нижняя' },
    ];

    return (
        <div className="flex gap-1.5">
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`pill !py-2 !px-3.5 !text-[13px] h-[38px] ${
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
