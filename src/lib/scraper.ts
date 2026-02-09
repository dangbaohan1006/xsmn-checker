import * as cheerio from 'cheerio';
import { LotteryResult, ERROR_CODES } from './types';

// Danh sách Mapping tên đài (DB Code -> Tên hiển thị trên web)
// Key: Mã trong DB (đã bỏ số cuối). Value: Các từ khóa có thể xuất hiện trên web
const STATION_MAP: Record<string, string[]> = {
    'tphcm': ['tp.hcm', 'hồ chí minh', 'tphcm', 'tp. hcm'],
    'dongthap': ['đồng tháp', 'dong thap'],
    'camau': ['cà mau', 'ca mau'],
    'bentre': ['bến tre', 'ben tre'],
    'vungtau': ['vũng tàu', 'vung tau'],
    'baclieu': ['bạc liêu', 'bac lieu'],
    'dongnai': ['đồng nai', 'dong nai'],
    'cantho': ['cần thơ', 'can tho'],
    'soctrang': ['sóc trăng', 'soc trang'],
    'tayninh': ['tây ninh', 'tay ninh'],
    'angiang': ['an giang'],
    'binhthuan': ['bình thuận', 'binh thuan'],
    'vinhlong': ['vĩnh long', 'vinh long'],
    'binhduong': ['bình dương', 'binh duong'],
    'travinh': ['trà vinh', 'tra vinh'],
    'longan': ['long an'],
    'binhphuoc': ['bình phước', 'binh phuoc'],
    'haugiang': ['hậu giang', 'hau giang'],
    'tiengiang': ['tiền giang', 'tien giang'],
    'kiengiang': ['kiên giang', 'kien giang'],
    'dalat': ['đà lạt', 'da lat', 'lâm đồng', 'lam dong']
};

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

const SCRAPE_TIMEOUT_MS = 15000;

function normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Check xem header của bảng (tableHeader) có khớp với mã đài (stationCode) không
 */
function isStationMatch(tableHeader: string, stationCode: string): boolean {
    const normalizedHeader = normalizeString(tableHeader);
    const cleanCode = stationCode.replace(/\d+$/, '');
    const keywords = STATION_MAP[cleanCode] || [cleanCode];
    return keywords.some(kw => normalizedHeader.includes(normalizeString(kw)));
}

async function fetchWithRotation(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
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
 * DÙNG 'any' ĐỂ TRÁNH LỖI BUILD
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
        if (prizeLabel.match(/db|dac\s*biet/)) prizeType = 'special';
        else if (prizeLabel.match(/nhat|g1/)) prizeType = 'first';
        else if (prizeLabel.match(/nhi|g2/)) prizeType = 'second';
        else if (prizeLabel.match(/ba|g3/)) prizeType = 'third';
        else if (prizeLabel.match(/tu|g4/)) prizeType = 'fourth';
        else if (prizeLabel.match(/nam|g5/)) prizeType = 'fifth';
        else if (prizeLabel.match(/sau|g6/)) prizeType = 'sixth';
        else if (prizeLabel.match(/bay|g7/)) prizeType = 'seventh';
        else if (prizeLabel.match(/tam|g8/)) prizeType = 'eighth';

        if (prizeType) {
            const values: string[] = [];
            $row.find('td').each((idx: number, cell: any) => {
                if (idx === 0) return;
                const text = $(cell).text();
                const nums = text.split(/[\s\-\.]+/);
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
    let targetTable: any = null;

    $('table.kqxs, .box_kqxs').each((_: any, tbl: any) => {
        const $tbl = $(tbl);
        const headerText = $tbl.find('th').text() + ' ' + $tbl.prev().text() + ' ' + $tbl.attr('data-station');

        if (isStationMatch(headerText, stationCode)) {
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
    let targetTable: any = null;

    $('table.rightcl, table.box_kqxs').each((_: any, tbl: any) => {
        const $tbl = $(tbl);
        const provinceName = $tbl.find('.tinh, .title, th').text();

        if (isStationMatch(provinceName, stationCode)) {
            targetTable = $tbl;
            return false;
        }
    });

    if (targetTable) {
        return parseGenericTable($, targetTable, stationCode, drawDate);
    }
    return [];
}

function createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject({ code: ERROR_CODES.SCRAPE_TIMEOUT }), ms);
    });
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