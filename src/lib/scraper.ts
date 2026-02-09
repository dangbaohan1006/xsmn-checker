import * as cheerio from 'cheerio';
import { LotteryResult, ERROR_CODES } from './types';

// User-Agent rotation pool
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
];

function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Timeout configuration
const SCRAPE_TIMEOUT_MS = 8000;

const SOURCES = {
    primary: (date: string) => `https://xoso.me/xsmn-${date}.html`,
    fallback: (date: string) => `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${date}.html`,
};

/**
 * Utility: Xóa dấu tiếng Việt và ký tự đặc biệt để so sánh tên đài
 */
function normalizeString(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]/g, ''); // Bỏ ký tự đặc biệt
}

/**
 * Create a timeout promise
 */
function createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject({ code: ERROR_CODES.SCRAPE_TIMEOUT }), ms);
    });
}

/**
 * Fetch HTML with User-Agent
 */
async function fetchWithRotation(url: string): Promise<string> {
    const response = await fetch(url, {
        headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
}

/**
 * Parse results from a generic table
 */
function parseTableResults(
    $: cheerio.CheerioAPI,
    table: cheerio.Cheerio<cheerio.Element>,
    stationCode: string,
    drawDate: string
): LotteryResult[] {
    const results: LotteryResult[] = [];

    table.find('tr').each((_, row) => {
        const $row = $(row);
        const prizeLabel = normalizeString($row.find('td:first-child, th:first-child').text());

        let prizeType: string | null = null;
        if (prizeLabel.includes('db') || prizeLabel.includes('dacbiet')) prizeType = 'special';
        else if (prizeLabel.includes('nhat') || prizeLabel === 'g1') prizeType = 'first';
        else if (prizeLabel.includes('nhi') || prizeLabel === 'g2') prizeType = 'second';
        else if (prizeLabel.includes('ba') || prizeLabel === 'g3') prizeType = 'third';
        else if (prizeLabel.includes('tu') || prizeLabel === 'g4') prizeType = 'fourth';
        else if (prizeLabel.includes('nam') || prizeLabel === 'g5') prizeType = 'fifth';
        else if (prizeLabel.includes('sau') || prizeLabel === 'g6') prizeType = 'sixth';
        else if (prizeLabel.includes('bay') || prizeLabel === 'g7') prizeType = 'seventh';
        else if (prizeLabel.includes('tam') || prizeLabel === 'g8') prizeType = 'eighth';

        if (prizeType) {
            const values: string[] = [];
            $row.find('td').each((index, cell) => {
                if (index === 0) return;
                const text = $(cell).text().trim();
                const numbers = text.split(/[\s-]+/);

                numbers.forEach(num => {
                    const cleanNum = num.replace(/\D/g, '');
                    if (cleanNum.length >= 2) values.push(cleanNum);
                });
            });

            values.forEach((val, order) => {
                results.push({
                    station_code: stationCode,
                    draw_date: drawDate,
                    prize_type: prizeType as any,
                    prize_order: order,
                    prize_value: val,
                });
            });
        }
    });

    return results;
}

/**
 * Parse Xoso.me logic
 */
function parseXosoMe($: cheerio.CheerioAPI, stationCode: string, drawDate: string): LotteryResult[] {
    const target = normalizeString(stationCode.replace(/\d+$/, ''));
    let targetTable: cheerio.Cheerio<cheerio.Element> | null = null;

    $('table.kqxs, .box_kqxs, table[class*="bkq"]').each((_, tbl) => {
        const $tbl = $(tbl);
        const headerText = normalizeString($tbl.find('th').first().text() + $tbl.prev().text() + $tbl.attr('data-station'));

        if (headerText.includes(target)) {
            targetTable = $tbl;
            return false;
        }
    });

    if (targetTable) {
        return parseTableResults($, targetTable, stationCode, drawDate);
    }
    return [];
}

/**
 * Parse MinhNgoc logic
 */
function parseMinhNgoc($: cheerio.CheerioAPI, stationCode: string, drawDate: string): LotteryResult[] {
    const target = normalizeString(stationCode.replace(/\d+$/, ''));
    const results: LotteryResult[] = [];

    $('table.bkqmiennam, table.box_kqxs').each((_, tbl) => {
        const $tbl = $(tbl);
        const headers = $tbl.find('thead tr th, tr.tinh th, tr.tinh td');

        let colIndex = -1;
        headers.each((idx, th) => {
            if (normalizeString($(th).text()).includes(target)) {
                colIndex = idx;
                return false;
            }
        });

        if (colIndex !== -1) {
            $tbl.find('tr').each((_, row) => {
                const $row = $(row);
                const cells = $row.find('td');

                // Safety check: cells[0] might not exist
                if (cells.length === 0) return;

                const prizeLabel = normalizeString($(cells[0]).text());

                let prizeType = '';
                if (prizeLabel.includes('db') || prizeLabel.includes('dacbiet')) prizeType = 'special';
                else if (prizeLabel.includes('g8') || prizeLabel.includes('tam')) prizeType = 'eighth';
                else if (prizeLabel.includes('g7') || prizeLabel.includes('bay')) prizeType = 'seventh';
                else if (prizeLabel.includes('g6') || prizeLabel.includes('sau')) prizeType = 'sixth';
                else if (prizeLabel.includes('g5') || prizeLabel.includes('nam')) prizeType = 'fifth';
                else if (prizeLabel.includes('g4') || prizeLabel.includes('tu')) prizeType = 'fourth';
                else if (prizeLabel.includes('g3') || prizeLabel.includes('ba')) prizeType = 'third';
                else if (prizeLabel.includes('g2') || prizeLabel.includes('nhi')) prizeType = 'second';
                else if (prizeLabel.includes('g1') || prizeLabel.includes('nhat')) prizeType = 'first';

                if (prizeType && cells.length > colIndex) {
                    const tableHeader = normalizeString($tbl.text());
                    // Logic xử lý bảng MinhNgoc mobile/desktop
                    if (tableHeader.includes(target)) {
                        // Lấy dữ liệu an toàn
                        const cellContent = $(cells[1]).text();
                        if (cellContent) {
                            const nums = cellContent.split(/[\s,-]+/).map(n => n.trim().replace(/\D/g, '')).filter(n => n.length > 1);
                            nums.forEach((v, i) => results.push({
                                station_code: stationCode, draw_date: drawDate, prize_type: prizeType as any, prize_order: i, prize_value: v
                            }));
                        }
                    }
                }
            });
        }
    });

    return results;
}

/**
 * Main Scraper - ĐÃ THÊM EXPORT
 */
export async function scrapeLotteryResults(stationCode: string, drawDate: string): Promise<LotteryResult[]> {
    const [year, month, day] = drawDate.split('-');
    const formattedDate = `${day}-${month}-${year}`;

    try {
        const html = await fetchWithRotation(SOURCES.primary(formattedDate));
        const $ = cheerio.load(html);
        const results = parseXosoMe($, stationCode, drawDate);
        if (results.length > 0) return results;
    } catch (e) {
        console.warn('Xoso.me failed:', e);
    }

    try {
        const html = await fetchWithRotation(SOURCES.fallback(formattedDate));
        const $ = cheerio.load(html);
        const results = parseMinhNgoc($, stationCode, drawDate);
        if (results.length > 0) return results;
    } catch (e) {
        console.warn('MinhNgoc failed:', e);
    }

    throw { code: ERROR_CODES.SCRAPE_FAILED };
}

export async function scrapeWithTimeout(stationCode: string, drawDate: string): Promise<LotteryResult[]> {
    return Promise.race([
        scrapeLotteryResults(stationCode, drawDate),
        createTimeout(SCRAPE_TIMEOUT_MS),
    ]);
}