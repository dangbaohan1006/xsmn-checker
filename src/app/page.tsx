'use client';

import { useState, useEffect, FormEvent } from 'react';
import NumberInput from '@/components/NumberInput';
import StationSelector from '@/components/StationSelector';
import ResultDisplay from '@/components/ResultDisplay';
import DateInput from '@/components/DateInput';
import { Station, CheckResponse } from '@/lib/types';

// Format date to YYYY-MM-DD
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

// Format date for display (DD/MM/YYYY)
function formatDisplayDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

// Get today's date in local timezone
function getToday(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
}

export default function Home() {
    // Form state
    const [ticketNumber, setTicketNumber] = useState('');
    const [selectedStation, setSelectedStation] = useState('');
    const [selectedDate, setSelectedDate] = useState(formatDate(getToday()));

    // Data state
    const [stations, setStations] = useState<Station[]>([]);
    const [stationsLoading, setStationsLoading] = useState(true);

    // Result state
    const [result, setResult] = useState<CheckResponse | null>(null);
    const [checking, setChecking] = useState(false);
    const [formError, setFormError] = useState('');

    // Fetch stations based on selected date's day of week
    useEffect(() => {
        async function fetchStations() {
            setStationsLoading(true);
            try {
                const date = new Date(selectedDate);
                const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday

                const response = await fetch(`/api/stations?day=${dayOfWeek}`);
                if (response.ok) {
                    const data: Station[] = await response.json();
                    setStations(data);

                    // Auto-select first station if none selected or current is not available
                    if (data.length > 0 && !data.find(s => s.code === selectedStation)) {
                        setSelectedStation(data[0].code);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch stations:', error);
            } finally {
                setStationsLoading(false);
            }
        }

        fetchStations();
    }, [selectedDate]);

    // Handle form submission
    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setFormError('');
        setResult(null);

        // Validate
        if (ticketNumber.length !== 6) {
            setFormError('Vui lòng nhập đủ 6 chữ số');
            return;
        }

        if (!selectedStation) {
            setFormError('Vui lòng chọn đài');
            return;
        }

        setChecking(true);

        try {
            const response = await fetch('/api/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticket_number: ticketNumber,
                    station_code: selectedStation,
                    draw_date: selectedDate,
                }),
            });

            const data: CheckResponse = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Check failed:', error);
            setResult({
                success: false,
                matches: [],
                all_results: [],
                total_win_amount: 0,
                message: 'Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.',
            });
        } finally {
            setChecking(false);
        }
    }

    // Calculate max date (allow tomorrow to prevent timezone issues blocking today)
    const maxDate = (() => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        return formatDate(date);
    })();

    // Calculate min date (30 days ago)
    const minDate = (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return formatDate(date);
    })();

    return (
        <div className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
            {/* Header */}
            <header className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-lg mb-2">
                    🎫 Dò Số Miền Nam
                </h1>
                <p className="text-white/80 text-lg">
                    Kiểm tra kết quả xổ số nhanh chóng, chính xác
                </p>
            </header>

            {/* Main card */}
            <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Date picker */}
                    <DateInput
                        value={selectedDate}
                        onChange={(value) => {
                            setSelectedDate(value);
                            setResult(null);
                        }}
                        min={minDate}
                        max={maxDate}
                        label="Ngày xổ số"
                    />

                    {/* Station selector */}
                    <StationSelector
                        stations={stations}
                        selectedStation={selectedStation}
                        onSelect={(code) => {
                            setSelectedStation(code);
                            setResult(null);
                        }}
                        loading={stationsLoading}
                    />

                    {/* Number input */}
                    <NumberInput
                        value={ticketNumber}
                        onChange={(value) => {
                            setTicketNumber(value);
                            setResult(null);
                        }}
                        disabled={checking}
                        error={formError}
                    />

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={checking || ticketNumber.length !== 6 || !selectedStation}
                        className={`
              w-full py-4 px-6 rounded-2xl text-xl font-bold
              shadow-lg hover:shadow-xl
              transition-all duration-200
              focus:outline-none focus:ring-4 focus:ring-primary-300
              disabled:opacity-50 disabled:cursor-not-allowed
              ${checking
                                ? 'bg-gray-400 text-white'
                                : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 active:scale-[0.98]'
                            }
            `}
                    >
                        {checking ? (
                            <span className="flex items-center justify-center gap-3">
                                <span className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                Đang dò số...
                            </span>
                        ) : (
                            '🔍 DÒ SỐ'
                        )}
                    </button>
                </form>

                {/* Results */}
                <div className="mt-6">
                    <ResultDisplay
                        result={result}
                        loading={checking}
                        ticketNumber={ticketNumber}
                    />
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-8 text-center text-white/60 text-sm">
                <p>Kết quả dò số chỉ mang tính tham khảo</p>
                <p className="mt-1">© 2026 XSMN Checker</p>
            </footer>
        </div>
    );
}
