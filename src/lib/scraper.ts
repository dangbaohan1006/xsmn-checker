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

const SCRAPE_TIMEOUT_MS = 15000; // 15s timeout

const SOURCES = {
    primary: (date: string) => `https://xoso.me/xsmn-${date}.html`,
    fallback: (date: string) => `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${date}.html`,
};

/**
 * Hàm chuẩn hóa chuỗi
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

function createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject({ code: ERROR_CODES.SCRAPE_TIMEOUT }), ms);
    });
}

async function fetchWithRotation(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
            },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
    } catch (error: any) {
        console.warn(`Fetch error: ${error.message}`);
        throw error;
    }
}

/**
 * SỬ DỤNG TYPE 'any' ĐỂ TRÁNH LỖI VERSION CHEERIO
 */
function parseGenericTable(
    $: any,
    table: any,
    stationCode: string,
    drawDate: string
): LotteryResult[] {
    const results: LotteryResult[] = [];

    table.find('tr').each((_: any, row: any) => {
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
            $row.find('td').each((idx: number, cell: any) => {
                if (idx === 0) return;
                const text = $(cell).text().trim();
                const nums = text.split(/[\s-]+/);
                nums.forEach((n: string) => {
                    const clean = n.replace(/\D/g, '');
                    if (clean.length >= 2) values.push(clean);
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

function parseXosoMe($: any, stationCode: string, drawDate: string): LotteryResult[] {
    const target = normalizeString(stationCode.replace(/\d+$/, ''));
    let targetTable: any = null;

    $('table.kqxs, .box_kqxs').each((_: any, tbl: any) => {
        const $tbl = $(tbl);
        const headerText = normalizeString($tbl.find('th').text() + $tbl.prev().text() + $tbl.attr('data-station'));

        if (headerText.includes(target)) {
            targetTable = $tbl;
            return false;
        }
    });

    if (targetTable) {
        return parseGenericTable($, targetTable, stationCode, drawDate);
    }
    return [];
}

function parseMinhNgoc($: any, stationCode: string, drawDate: string): LotteryResult[] {
    const target = normalizeString(stationCode.replace(/\d+$/, ''));
    let targetTable: any = null;

    $('table.rightcl, table.box_kqxs').each((_: any, tbl: any) => {
        const $tbl = $(tbl);
        const provinceName = normalizeString($tbl.find('.tinh, .title, th').text());

        if (provinceName.includes(target)) {
            targetTable = $tbl;
            return false;
        }
    });

    if (targetTable) {
        return parseGenericTable($, targetTable, stationCode, drawDate);
    }
    return [];
}

export async function scrapeLotteryResults(stationCode: string, drawDate: string): Promise<LotteryResult[]> {
    const [year, month, day] = drawDate.split('-');
    const formattedDate = `${day}-${month}-${year}`;

    // 1. Try Xoso.me
    try {
        const html = await fetchWithRotation(SOURCES.primary(formattedDate));
        const $ = cheerio.load(html);
        const results = parseXosoMe($, stationCode, drawDate);
        if (results.length > 0) return results;
    } catch (e) {
        // Silent fail
    }

    // 2. Try MinhNgoc
    try {
        const html = await fetchWithRotation(SOURCES.fallback(formattedDate));
        const $ = cheerio.load(html);
        const results = parseMinhNgoc($, stationCode, drawDate);
        if (results.length > 0) return results;
    } catch (e) {
        console.warn('Fallback failed:', e);
    }

    throw { code: ERROR_CODES.SCRAPE_FAILED };
}

export async function scrapeWithTimeout(stationCode: string, drawDate: string): Promise<LotteryResult[]> {
    return Promise.race([
        scrapeLotteryResults(stationCode, drawDate),
        createTimeout(SCRAPE_TIMEOUT_MS),
    ]);
}