'use client';

import { ChangeEvent, useRef, useEffect } from 'react';

interface NumberInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    error?: string;
}

export default function NumberInput({ value, onChange, disabled, error }: NumberInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on mount
    useEffect(() => {
        if (inputRef.current && !disabled) {
            inputRef.current.focus();
        }
    }, [disabled]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        // Only allow digits, max 6
        const newValue = e.target.value.replace(/\D/g, '').slice(0, 6);
        onChange(newValue);
    };

    return (
        <div className="w-full">
            <label className="block text-lg font-semibold text-gray-700 mb-3">
                Nhập số vé (6 chữ số)
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    placeholder="______"
                    className={`
            w-full text-center text-4xl tracking-[1rem] py-5 px-4
            border-3 rounded-2xl font-mono
            bg-white shadow-lg
            transition-all duration-200
            placeholder:tracking-[0.5rem] placeholder:text-gray-300
            focus:outline-none focus:ring-4 focus:ring-primary-200 focus:border-primary-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}
          `}
                    aria-label="Số vé xổ số"
                    aria-describedby={error ? 'ticket-error' : undefined}
                />

                {/* Digit counter */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {value.length}/6
                </div>
            </div>

            {/* Error message */}
            {error && (
                <p id="ticket-error" className="mt-2 text-red-600 text-sm font-medium">
                    {error}
                </p>
            )}

            {/* Helper text */}
            {!error && value.length > 0 && value.length < 6 && (
                <p className="mt-2 text-amber-600 text-sm">
                    Còn thiếu {6 - value.length} chữ số
                </p>
            )}

            {value.length === 6 && (
                <p className="mt-2 text-green-600 text-sm font-medium">
                    ✓ Đã nhập đủ 6 số
                </p>
            )}
        </div>
    );
}
