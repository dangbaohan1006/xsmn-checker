import * as cheerio from 'cheerio';
import { LotteryResult, ERROR_CODES } from './types';

// User-Agent rotation pool
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Timeout configuration
const SCRAPE_TIMEOUT_MS = 30000;

// Scraper sources
const SOURCES = {
    primary: (date: string) => `https://xoso.me/xsmn-${date}.html`,
    fallback: (date: string) => `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${date}.html`,
};

// Prize type mapping (order matters for parsing)
const PRIZE_SELECTORS = {
    special: { selector: '.giaidb, .giai-db, [class*="special"]', type: 'special' as const },
    first: { selector: '.giai1, .giai-1, [class*="first"]', type: 'first' as const },
    second: { selector: '.giai2, .giai-2, [class*="second"]', type: 'second' as const },
    third: { selector: '.giai3, .giai-3, [class*="third"]', type: 'third' as const },
    fourth: { selector: '.giai4, .giai-4, [class*="fourth"]', type: 'fourth' as const },
    fifth: { selector: '.giai5, .giai-5, [class*="fifth"]', type: 'fifth' as const },
    sixth: { selector: '.giai6, .giai-6, [class*="sixth"]', type: 'sixth' as const },
    seventh: { selector: '.giai7, .giai-7, [class*="seventh"]', type: 'seventh' as const },
    eighth: { selector: '.giai8, .giai-8, [class*="eighth"]', type: 'eighth' as const },
};

/**
 * Create a timeout promise that rejects after specified ms
 */
function createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject({ code: ERROR_CODES.SCRAPE_TIMEOUT }), ms);
    });
}

/**
 * Fetch HTML with User-Agent rotation
 */
async function fetchWithRotation(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.text();
    } catch (error: any) {
        console.error(`Fetch error for ${url}: ${error.message}`);
        if (error.cause) console.error('Cause:', error.cause);
        throw error;
    }
}

/**
 * Parse lottery results from xoso.me HTML structure
 */
function parseXosoMe($: any, stationCode: string, drawDate: string): LotteryResult[] {
    const results: LotteryResult[] = [];

    // Find the table for the specific station
    const stationTable = $(`table.kqxs, .box_kqxs, [data-station="${stationCode}"]`).first();

    if (stationTable.length === 0) {
        // Try alternative: find by station name in header
        const tables = $('table');
        for (let i = 0; i < tables.length; i++) {
            const table = $(tables[i]);
            const header = table.find('th, .tinh, .header').first().text().toLowerCase();
            if (header.includes(stationCode) || header.includes(stationCode.replace(/\d+$/, ''))) {
                return parseTableResults($, table, stationCode, drawDate);
            }
        }
    }

    return parseTableResults($, stationTable, stationCode, drawDate);
}

/**
 * Parse results from a specific table element
 */
function parseTableResults(
    $: any,
    table: cheerio.Cheerio,
    stationCode: string,
    drawDate: string
): LotteryResult[] {
    const results: LotteryResult[] = [];

    // Parse each prize row
    table.find('tr').each((_: number, row: any) => {
        const $row = $(row);
        const prizeLabel = $row.find('td:first-child, th:first-child').text().toLowerCase();

        let prizeType: string | null = null;

        if (prizeLabel.includes('đb') || prizeLabel.includes('đặc biệt')) {
            prizeType = 'special';
        } else if (prizeLabel.includes('nhất') || prizeLabel === 'g1') {
            prizeType = 'first';
        } else if (prizeLabel.includes('nhì') || prizeLabel === 'g2') {
            prizeType = 'second';
        } else if (prizeLabel.includes('ba') || prizeLabel === 'g3') {
            prizeType = 'third';
        } else if (prizeLabel.includes('tư') || prizeLabel === 'g4') {
            prizeType = 'fourth';
        } else if (prizeLabel.includes('năm') || prizeLabel === 'g5') {
            prizeType = 'fifth';
        } else if (prizeLabel.includes('sáu') || prizeLabel === 'g6') {
            prizeType = 'sixth';
        } else if (prizeLabel.includes('bảy') || prizeLabel === 'g7') {
            prizeType = 'seventh';
        } else if (prizeLabel.includes('tám') || prizeLabel === 'g8') {
            prizeType = 'eighth';
        }

        if (prizeType) {
            // Get all prize values from this row
            const prizeValues = $row.find('td:not(:first-child) span, td:not(:first-child)').map((i: number, el: any) => {
                const text = $(el).text().trim().replace(/\D/g, '');
                return text.length >= 2 ? text : null;
            }).get().filter(Boolean);

            prizeValues.forEach((value: string, order: number) => {
                if (value) {
                    results.push({
                        station_code: stationCode,
                        draw_date: drawDate,
                        prize_type: prizeType as LotteryResult['prize_type'],
                        prize_order: order,
                        prize_value: value,
                    });
                }
            });
        }
    });

    return results;
}

/**
 * Remove accents and special characters
 */
function removeAccents(str: string): string {
    return str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}

/**
 * Map station codes to potential names on MinhNgoc
 */
const STATION_NAME_MAP: Record<string, string[]> = {
    'TP.HCM': ['tp.hcm', 'ho chi minh', 'hcm'],
    'DT': ['dong thap'],
    'CM': ['ca mau'],
    'TG': ['tien giang'],
    'KG': ['kien giang'],
    'DL': ['da lat'],
    'VT': ['vung tau'],
    'BL': ['bac lieu'],
    'BT': ['ben tre'],
    'DN': ['dong nai'],
    'CT': ['can tho'],
    'ST': ['soc trang'],
    'TN': ['tay ninh'],
    'AG': ['an giang'],
    'BTH': ['binh thuan'],
    'BD': ['binh duong'],
    'TV': ['tra vinh'],
    'VL': ['vinh long'],
    'BP': ['binh phuoc'],
    'HG': ['hau giang'],
    'LA': ['long an']
};

/**
 * Parse lottery results from minhngoc.net HTML structure (fallback)
 */
function parseMinhNgoc($: any, stationCode: string, drawDate: string): LotteryResult[] {
    const results: LotteryResult[] = [];

    // Find all rightcl tables (single station tables)
    const tables = $('table.rightcl');

    tables.each((_: number, table: any) => {
        const $table = $(table);
        const stationNameRaw = $table.find('td.tinh').text();
        const stationName = removeAccents(stationNameRaw);

        // Check if this table belongs to the requested station
        let isMatch = false;

        // Direct match with code
        if (stationName.includes(removeAccents(stationCode))) {
            isMatch = true;
        }
        // Match via map
        else if (STATION_NAME_MAP[stationCode]) {
            if (STATION_NAME_MAP[stationCode].some(name => stationName.includes(name))) {
                isMatch = true;
            }
        }

        if (isMatch) {
            // Map class names to prize types
            const prizes = [
                { selector: '.giaidb', type: 'special' },
                { selector: '.giai1', type: 'first' },
                { selector: '.giai2', type: 'second' },
                { selector: '.giai3', type: 'third' },
                { selector: '.giai4', type: 'fourth' },
                { selector: '.giai5', type: 'fifth' },
                { selector: '.giai6', type: 'sixth' },
                { selector: '.giai7', type: 'seventh' },
                { selector: '.giai8', type: 'eighth' }
            ];

            prizes.forEach(({ selector, type }) => {
                // Sometimes values are directly in td or in div
                let values: string[] = [];

                // Better approach: Select the TD, then find DIVs or take text
                const $td = $table.find(`td${selector}`).first();
                const $divs = $td.find('div');

                if ($divs.length > 0) {
                    $divs.each((_: number, div: any) => {
                        const v = $(div).text().trim().replace(/\D/g, '');
                        if (v.length >= 2) values.push(v);
                    });
                } else {
                    const v = $td.text().trim().replace(/\D/g, '');
                    if (v.length >= 2) values.push(v);
                }

                // Deduplicate values just in case
                values = Array.from(new Set(values));

                values.forEach((value, order) => {
                    results.push({
                        station_code: stationCode,
                        draw_date: drawDate,
                        prize_type: type as LotteryResult['prize_type'],
                        prize_order: order,
                        prize_value: value,
                    });
                });
            });
        }
    });

    return results;
}

/**
 * Main scraper function with timeout and fallback
 */
async function scrapeLotteryResults(stationCode: string, drawDate: string): Promise<LotteryResult[]> {
    // Format date for URLs (DD-MM-YYYY)
    const [year, month, day] = drawDate.split('-');
    const formattedDate = `${day}-${month}-${year}`;

    // Try primary source first
    try {
        console.log(`Fetching primary: ${SOURCES.primary(formattedDate)}`);
        const html = await fetchWithRotation(SOURCES.primary(formattedDate));
        const $ = cheerio.load(html);
        const results = parseXosoMe($, stationCode, drawDate);

        if (results.length > 0) {
            return results;
        }
    } catch (error) {
        console.warn('Primary source failed, trying fallback...', error);
    }

    // Try fallback source
    try {
        console.log(`Fetching fallback: ${SOURCES.fallback(formattedDate)}`);
        const html = await fetchWithRotation(SOURCES.fallback(formattedDate));
        const $ = cheerio.load(html);
        const results = parseMinhNgoc($, stationCode, drawDate);

        if (results.length > 0) {
            return results;
        }
        console.warn('Fallback source returned 0 results');
    } catch (error) {
        console.error('Fallback source also failed', error);
    }

    throw { code: ERROR_CODES.SCRAPE_FAILED, message: 'Both sources failed' };
}

/**
 * Scrape with timeout protection
 */
export async function scrapeWithTimeout(
    stationCode: string,
    drawDate: string
): Promise<LotteryResult[]> {
    return Promise.race([
        scrapeLotteryResults(stationCode, drawDate),
        createTimeout(SCRAPE_TIMEOUT_MS),
    ]);
}

export { scrapeLotteryResults };
