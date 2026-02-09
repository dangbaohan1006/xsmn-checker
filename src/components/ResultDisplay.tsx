'use client';

import { useEffect, useRef } from 'react';
import { CheckResponse, MatchResult, PRIZE_CONFIGS } from '@/lib/types';
import { formatPrizeAmount } from '@/lib/matcher';

interface ResultDisplayProps {
    result: CheckResponse | null;
    loading?: boolean;
    ticketNumber?: string;
}

// Speak result using Web Speech API
function announceResult(hasWon: boolean, matches: MatchResult[]) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance();
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    if (hasWon) {
        const prizeNames = matches.map(m => m.prize_name).join(', ');
        utterance.text = `Chúc mừng! Bạn đã trúng ${prizeNames}!`;
    } else {
        utterance.text = 'Rất tiếc, bạn chưa trúng thưởng. Chúc may mắn lần sau!';
    }

    // Small delay to ensure UI updates first
    setTimeout(() => {
        speechSynthesis.speak(utterance);
    }, 300);
}

export default function ResultDisplay({ result, loading, ticketNumber }: ResultDisplayProps) {
    const hasAnnounced = useRef(false);

    // Announce result when it changes
    useEffect(() => {
        if (result && result.success && !hasAnnounced.current) {
            const hasWon = result.matches.length > 0;
            announceResult(hasWon, result.matches);
            hasAnnounced.current = true;
        }

        // Reset for next result
        if (!result) {
            hasAnnounced.current = false;
        }
    }, [result]);

    if (loading) {
        return (
            <div className="w-full bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <p className="mt-4 text-gray-600 text-lg">Đang dò số...</p>
                </div>
            </div>
        );
    }

    if (!result) {
        return null;
    }

    // Error state
    if (!result.success) {
        return (
            <div className="w-full bg-amber-50 rounded-2xl p-6 shadow-lg border-2 border-amber-200">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">⚠️</span>
                    <div>
                        <h3 className="text-lg font-bold text-amber-800">Không thể kiểm tra</h3>
                        <p className="text-amber-700">{result.message}</p>
                    </div>
                </div>
            </div>
        );
    }

    const hasWon = result.matches.length > 0;

    return (
        <div className={`
      w-full rounded-2xl p-6 shadow-xl
      ${hasWon
                ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200'
            }
    `}>
            {/* Main result header */}
            <div className="text-center mb-6">
                {hasWon ? (
                    <>
                        <div className="text-6xl mb-3">🎉</div>
                        <h3 className="text-3xl font-bold text-green-700 mb-2">
                            TRÚNG THƯỞNG!
                        </h3>
                        <p className="text-green-600 text-lg">
                            Chúc mừng bạn đã trúng {result.matches.length} giải!
                        </p>
                    </>
                ) : (
                    <>
                        <div className="text-5xl mb-3">🍀</div>
                        <h3 className="text-2xl font-bold text-gray-600 mb-2">
                            Chưa trúng thưởng
                        </h3>
                        <p className="text-gray-500">
                            Chúc bạn may mắn lần sau!
                        </p>
                    </>
                )}
            </div>

            {/* Win details */}
            {hasWon && (
                <div className="bg-white rounded-xl p-4 mb-4 shadow-inner">
                    <h4 className="font-semibold text-gray-700 mb-3">Chi tiết giải thưởng:</h4>
                    <div className="space-y-3">
                        {result.matches.map((match, idx) => (
                            <div
                                key={idx}
                                className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200"
                            >
                                <div>
                                    <span className="font-bold text-green-700">{match.prize_name}</span>
                                    <span className="ml-2 text-gray-600 font-mono">({match.prize_value})</span>
                                </div>
                                <span className="font-bold text-green-600 text-lg">
                                    {formatPrizeAmount(match.prize_amount)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="mt-4 pt-4 border-t-2 border-green-200 flex justify-between items-center">
                        <span className="font-bold text-gray-700 text-lg">Tổng thưởng:</span>
                        <span className="font-bold text-green-700 text-2xl">
                            {formatPrizeAmount(result.total_win_amount)}
                        </span>
                    </div>
                </div>
            )}

            {/* Ticket number display */}
            {ticketNumber && (
                <div className="text-center mt-4 pt-4 border-t border-gray-200">
                    <span className="text-gray-500 text-sm">Số vé đã dò: </span>
                    <span className="font-mono font-bold text-lg text-gray-700 tracking-widest">
                        {ticketNumber}
                    </span>
                </div>
            )}

            {/* Audio control hint */}
            <div className="text-center mt-4">
                <button
                    type="button"
                    onClick={() => announceResult(hasWon, result.matches)}
                    className="text-sm text-gray-500 hover:text-primary-600 underline"
                >
                    🔊 Nghe lại kết quả
                </button>
            </div>
        </div>
    );
}
