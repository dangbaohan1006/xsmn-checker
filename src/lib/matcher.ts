import { LotteryResult, MatchResult, PRIZE_CONFIGS, SPECIAL_PRIZES } from './types';

/**
 * Standard suffix matching for regular prizes
 * Match if last N digits of ticket match prize value
 */
export function checkTicketMatch(ticket: string, prizeValue: string): boolean {
    const ticketSuffix = ticket.slice(-prizeValue.length);
    return ticketSuffix === prizeValue;
}

/**
 * Giải Phụ Đặc Biệt - 5 last digits match Special Prize
 * Win if ticket.slice(1) === specialPrize.slice(1)
 */
export function checkGiaiPhuDB(ticket: string, specialPrize: string): boolean {
    if (ticket.length !== 6 || specialPrize.length !== 6) return false;
    return ticket.slice(1) === specialPrize.slice(1);
}

/**
 * Giải Khuyến Khích - Exactly 1 digit mismatch (not first digit)
 * Excludes Giải Phụ case where only first digit differs
 */
export function checkGiaiKhuyenKhich(ticket: string, specialPrize: string): boolean {
    if (ticket.length !== 6 || specialPrize.length !== 6) return false;

    // Exclude Giải Phụ case (only first digit different)
    if (ticket.slice(1) === specialPrize.slice(1)) return false;

    // Exclude exact match (already won Đặc Biệt)
    if (ticket === specialPrize) return false;

    let mismatchCount = 0;
    let mismatchIndex = -1;

    for (let i = 0; i < 6; i++) {
        if (ticket[i] !== specialPrize[i]) {
            mismatchCount++;
            mismatchIndex = i;
        }
    }

    // Win if exactly 1 mismatch AND it's not the first digit
    return mismatchCount === 1 && mismatchIndex !== 0;
}

/**
 * Get prize name and amount from prize type
 */
function getPrizeInfo(prizeType: string): { name: string; amount: number } {
    const config = PRIZE_CONFIGS.find(p => p.type === prizeType);
    if (config) {
        return { name: config.name, amount: config.prizeAmount };
    }
    return { name: prizeType, amount: 0 };
}

/**
 * Format prize amount for display
 */
export function formatPrizeAmount(amount: number): string {
    if (amount >= 1000000000) {
        return `${(amount / 1000000000).toFixed(0)} tỷ`;
    }
    if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(0)} triệu`;
    }
    return `${amount.toLocaleString('vi-VN')}đ`;
}

/**
 * Main matching function - check ticket against all results
 */
export function findAllMatches(ticket: string, results: LotteryResult[]): MatchResult[] {
    const matches: MatchResult[] = [];

    if (ticket.length !== 6) {
        return matches;
    }

    // Find special prize for sub-prize checking
    const specialPrize = results.find(r => r.prize_type === 'special')?.prize_value;

    // Check standard prizes (suffix matching)
    for (const result of results) {
        if (checkTicketMatch(ticket, result.prize_value)) {
            const prizeInfo = getPrizeInfo(result.prize_type);
            matches.push({
                prize_type: result.prize_type,
                prize_name: prizeInfo.name,
                prize_value: result.prize_value,
                prize_amount: prizeInfo.amount,
            });
        }
    }

    // Check special sub-prizes (only if we have special prize)
    if (specialPrize && specialPrize.length === 6) {
        // Check Giải Phụ Đặc Biệt (don't add if already won special)
        const hasSpecial = matches.some(m => m.prize_type === 'special');

        if (!hasSpecial && checkGiaiPhuDB(ticket, specialPrize)) {
            matches.push({
                prize_type: 'giai_phu_db',
                prize_name: SPECIAL_PRIZES.giaiPhuDB.name,
                prize_value: specialPrize,
                prize_amount: SPECIAL_PRIZES.giaiPhuDB.prizeAmount,
            });
        }

        // Check Giải Khuyến Khích (don't add if already won special or Phụ)
        const hasGiaiPhu = matches.some(m => m.prize_type === 'giai_phu_db');

        if (!hasSpecial && !hasGiaiPhu && checkGiaiKhuyenKhich(ticket, specialPrize)) {
            matches.push({
                prize_type: 'giai_khuyen_khich',
                prize_name: SPECIAL_PRIZES.giaiKhuyenKhich.name,
                prize_value: specialPrize,
                prize_amount: SPECIAL_PRIZES.giaiKhuyenKhich.prizeAmount,
            });
        }
    }

    // Sort by prize amount (highest first)
    matches.sort((a, b) => b.prize_amount - a.prize_amount);

    return matches;
}

/**
 * Calculate total win amount
 */
export function calculateTotalWin(matches: MatchResult[]): number {
    return matches.reduce((sum, match) => sum + match.prize_amount, 0);
}
