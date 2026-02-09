// Station (Lottery Province)
export interface Station {
    id: number;
    code: string;
    name: string;
    short_name: string;
    draw_day: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
    region: string;
    is_active: boolean;
    created_at: string;
}

// Lottery Result from database
export interface LotteryResult {
    id?: number;
    station_code: string;
    draw_date: string; // YYYY-MM-DD
    prize_type: PrizeType;
    prize_order: number;
    prize_value: string;
    created_at?: string;
}

// Prize types
export type PrizeType =
    | 'special'
    | 'first'
    | 'second'
    | 'third'
    | 'fourth'
    | 'fifth'
    | 'sixth'
    | 'seventh'
    | 'eighth';

// Prize configuration
export interface PrizeConfig {
    type: PrizeType;
    name: string;
    shortName: string;
    digits: number;
    count: number;
    prizeAmount: number; // in VND
}

export const PRIZE_CONFIGS: PrizeConfig[] = [
    { type: 'special', name: 'Giải Đặc Biệt', shortName: 'ĐB', digits: 6, count: 1, prizeAmount: 2000000000 },
    { type: 'first', name: 'Giải Nhất', shortName: 'G1', digits: 5, count: 1, prizeAmount: 30000000 },
    { type: 'second', name: 'Giải Nhì', shortName: 'G2', digits: 5, count: 1, prizeAmount: 15000000 },
    { type: 'third', name: 'Giải Ba', shortName: 'G3', digits: 5, count: 2, prizeAmount: 10000000 },
    { type: 'fourth', name: 'Giải Tư', shortName: 'G4', digits: 5, count: 7, prizeAmount: 3000000 },
    { type: 'fifth', name: 'Giải Năm', shortName: 'G5', digits: 4, count: 1, prizeAmount: 1000000 },
    { type: 'sixth', name: 'Giải Sáu', shortName: 'G6', digits: 4, count: 3, prizeAmount: 400000 },
    { type: 'seventh', name: 'Giải Bảy', shortName: 'G7', digits: 3, count: 1, prizeAmount: 200000 },
    { type: 'eighth', name: 'Giải Tám', shortName: 'G8', digits: 2, count: 1, prizeAmount: 100000 },
];

// Special prizes (not in standard table)
export const SPECIAL_PRIZES = {
    giaiPhuDB: { name: 'Giải Phụ Đặc Biệt', prizeAmount: 50000000 },
    giaiKhuyenKhich: { name: 'Giải Khuyến Khích', prizeAmount: 6800000 },
};

// API Request/Response types
export interface CheckRequest {
    ticket_number: string;
    station_code: string;
    draw_date: string;
}

export interface MatchResult {
    prize_type: string;
    prize_name: string;
    prize_value: string;
    prize_amount: number;
}

export interface CheckResponse {
    success: boolean;
    matches: MatchResult[];
    all_results: LotteryResult[];
    total_win_amount: number;
    error_code?: string;
    message?: string;
}

// Error codes
export const ERROR_CODES = {
    SCRAPE_TIMEOUT: 'SCRAPE_TIMEOUT',
    SCRAPE_FAILED: 'SCRAPE_FAILED',
    INVALID_INPUT: 'INVALID_INPUT',
    NO_RESULTS: 'NO_RESULTS',
    DB_ERROR: 'DB_ERROR',
} as const;
