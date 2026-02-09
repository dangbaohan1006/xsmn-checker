'use client';

import { Station } from '@/lib/types';

interface StationSelectorProps {
    stations: Station[];
    selectedStation: string;
    onSelect: (stationCode: string) => void;
    loading?: boolean;
}

export default function StationSelector({
    stations,
    selectedStation,
    onSelect,
    loading
}: StationSelectorProps) {
    if (loading) {
        return (
            <div className="w-full">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Chọn đài
                </label>
                <div className="flex gap-3 flex-wrap">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-14 w-28 bg-gray-200 rounded-xl animate-pulse"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (stations.length === 0) {
        return (
            <div className="w-full">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Chọn đài
                </label>
                <p className="text-gray-500 italic">Không có đài xổ số cho ngày này</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <label className="block text-lg font-semibold text-gray-700 mb-3">
                Chọn đài
            </label>
            <div className="flex gap-3 flex-wrap" role="radiogroup" aria-label="Chọn đài xổ số">
                {stations.map((station) => (
                    <button
                        key={station.code}
                        type="button"
                        role="radio"
                        aria-checked={selectedStation === station.code}
                        onClick={() => onSelect(station.code)}
                        className={`
              px-5 py-3 rounded-xl font-semibold text-lg
              transition-all duration-200
              shadow-md hover:shadow-lg
              focus:outline-none focus:ring-4 focus:ring-primary-200
              ${selectedStation === station.code
                                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white scale-105'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                            }
            `}
                    >
                        {station.short_name}
                    </button>
                ))}
            </div>

            {/* Selected station full name */}
            {selectedStation && (
                <p className="mt-3 text-sm text-gray-600">
                    Đã chọn: <span className="font-semibold text-primary-600">
                        {stations.find(s => s.code === selectedStation)?.name}
                    </span>
                </p>
            )}
        </div>
    );
}
