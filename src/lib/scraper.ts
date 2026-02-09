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
const SCRAPE_TIMEOUT_MS = 6000;

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
}

/**
 * Parse lottery results from xoso.me HTML structure
 */
function parseXosoMe($: cheerio.CheerioAPI, stationCode: string, drawDate: string): LotteryResult[] {
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
    $: cheerio.CheerioAPI,
    table: cheerio.Cheerio<cheerio.Element>,
    stationCode: string,
    drawDate: string
): LotteryResult[] {
    const results: LotteryResult[] = [];

    // Parse each prize row
    table.find('tr').each((_, row) => {
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
            const prizeValues = $row.find('td:not(:first-child) span, td:not(:first-child)').map((i, el) => {
                const text = $(el).text().trim().replace(/\D/g, '');
                return text.length >= 2 ? text : null;
            }).get().filter(Boolean);

            prizeValues.forEach((value, order) => {
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
 * Parse lottery results from minhngoc.net HTML structure (fallback)
 */
function parseMinhNgoc($: cheerio.CheerioAPI, stationCode: string, drawDate: string): LotteryResult[] {
    const results: LotteryResult[] = [];

    // minhngoc uses different structure - adapt as needed
    $('table.bkqmiennam tr, .box_kqxs tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');

        if (cells.length >= 2) {
            const labelCell = $(cells[0]).text().toLowerCase();
            const valueCell = $(cells[1]);

            let prizeType: string | null = null;

            // Similar mapping logic
            if (labelCell.includes('đb')) prizeType = 'special';
            else if (labelCell.includes('g.1') || labelCell.includes('nhất')) prizeType = 'first';
            else if (labelCell.includes('g.2') || labelCell.includes('nhì')) prizeType = 'second';
            else if (labelCell.includes('g.3') || labelCell.includes('ba')) prizeType = 'third';
            else if (labelCell.includes('g.4') || labelCell.includes('tư')) prizeType = 'fourth';
            else if (labelCell.includes('g.5') || labelCell.includes('năm')) prizeType = 'fifth';
            else if (labelCell.includes('g.6') || labelCell.includes('sáu')) prizeType = 'sixth';
            else if (labelCell.includes('g.7') || labelCell.includes('bảy')) prizeType = 'seventh';
            else if (labelCell.includes('g.8') || labelCell.includes('tám')) prizeType = 'eighth';

            if (prizeType) {
                const values = valueCell.text().split(/[-–,\s]+/).map(v => v.trim().replace(/\D/g, '')).filter(v => v.length >= 2);
                values.forEach((value, order) => {
                    results.push({
                        station_code: stationCode,
                        draw_date: drawDate,
                        prize_type: prizeType as LotteryResult['prize_type'],
                        prize_order: order,
                        prize_value: value,
                    });
                });
            }
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
        const html = await fetchWithRotation(SOURCES.fallback(formattedDate));
        const $ = cheerio.load(html);
        const results = parseMinhNgoc($, stationCode, drawDate);

        if (results.length > 0) {
            return results;
        }
    } catch (error) {
        console.error('Fallback source also failed', error);
    }

    throw { code: ERROR_CODES.SCRAPE_FAILED };
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
