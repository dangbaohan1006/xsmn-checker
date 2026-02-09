'use client';

interface DateInputProps {
    value: string; // Format: YYYY-MM-DD
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    label?: string;
}

export default function DateInput({ value, onChange, min, max, label }: DateInputProps) {
    // Helper: Chuyển đổi YYYY-MM-DD sang DD/MM/YYYY để hiển thị
    const formatDisplay = (isoDate: string) => {
        if (!isoDate) return 'dd/mm/yyyy';
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="w-full">
            {label && (
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                    {label}
                </label>
            )}

            <div className="relative w-full">
                {/* Native date input - visible but styled */}
                <input
                    type="date"
                    value={value}
                    min={min}
                    max={max}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-14 px-4 border-2 border-gray-300 rounded-xl bg-white cursor-pointer
                               text-transparent
                               focus:outline-none focus:ring-4 focus:ring-primary-200 focus:border-primary-500
                               [&::-webkit-calendar-picker-indicator]:opacity-0
                               [&::-webkit-calendar-picker-indicator]:absolute
                               [&::-webkit-calendar-picker-indicator]:w-full
                               [&::-webkit-calendar-picker-indicator]:h-full"
                    style={{
                        colorScheme: 'light',
                    }}
                    aria-label={label}
                />

                {/* Display overlay - shows formatted date */}
                <div
                    className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none"
                >
                    <span className="text-xl font-bold text-gray-800 tracking-wider">
                        {formatDisplay(value)}
                    </span>

                    {/* Icon Lịch */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-7 w-7 text-primary-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            </div>

            <p className="mt-2 text-sm text-gray-500 italic">
                * Chạm vào khung để đổi ngày
            </p>
        </div>
    );
}
