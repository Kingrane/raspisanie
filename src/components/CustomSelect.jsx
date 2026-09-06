import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({
    value,
    options = [],
    onChange,
    placeholder = 'Выбрать...',
    disabled = false,
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(
        opt => String(opt.value ?? opt.id) === String(value)
    );

    // Close dropdown on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleSelect = (val) => {
        onChange?.(val);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center justify-between gap-2.5 rounded-full border border-cream font-semibold transition-colors duration-200 select-none py-2 px-4 text-[14px] leading-tight ${
                    disabled
                        ? 'border-hairline text-cream-muted cursor-not-allowed opacity-50'
                        : isOpen
                        ? 'bg-white/[0.08] text-cream'
                        : 'text-cream hover:bg-white/[0.08]'
                }`}
            >
                <span className="truncate max-w-[160px] sm:max-w-[200px]">
                    {selectedOption?.label || selectedOption?.name || placeholder}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-cream-muted transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {isOpen && !disabled && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-full w-max max-w-[280px] max-h-[300px] overflow-y-auto bg-panel border border-hairline rounded-[12px] shadow-2xl p-1.5 flex flex-col gap-0.5 fade-up">
                    {options.map((opt) => {
                        const optVal = opt.value ?? opt.id;
                        const isSelected = String(optVal) === String(value);
                        const label = opt.label || opt.name || optVal;

                        return (
                            <button
                                key={optVal}
                                type="button"
                                onClick={() => handleSelect(optVal)}
                                className={`w-full text-left px-3 py-2 rounded-[8px] text-[13px] sm:text-[14px] font-medium transition-colors flex items-center justify-between gap-3 ${
                                    isSelected
                                        ? 'bg-white/[0.08] text-cream font-semibold'
                                        : 'text-cream/90 hover:bg-white/[0.05] hover:text-cream'
                                }`}
                            >
                                <span className="truncate">{label}</span>
                                {isSelected && (
                                    <Check size={14} className="text-green shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
