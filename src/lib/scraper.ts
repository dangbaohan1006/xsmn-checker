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
];

const SCRAPE_TIMEOUT_MS = 15000;

function normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Check xem header của bảng (tableHeader) có khớp với mã đài (stationCode) không
 * Dựa vào STATION_MAP
 */
function isStationMatch(tableHeader: string, stationCode: string): boolean {
    const normalizedHeader = normalizeString(tableHeader);
    // 1. Clean code từ DB (vd: tphcm1 -> tphcm)
    const cleanCode = stationCode.replace(/\d+$/, '');

    // 2. Lấy danh sách từ khóa cho đài này
    const keywords = STATION_MAP[cleanCode] || [cleanCode];

    // 3. So sánh
    return keywords.some(kw => normalizedHeader.includes(normalizeString(kw)));
}

async function fetchWithRotation(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s fetch timeout

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://www.google.com/',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Hàm parse dùng 'any' để tránh lỗi Type Cheerio
 */
function parseGenericTable($: any, table: any, stationCode: string, drawDate: string): LotteryResult[] {
    const results: LotteryResult[] = [];

    table.find('tr').each((_: any, row: any) => {
        const $row = $(row);
        const prizeLabel = normalizeString($row.find('td:first-child, th:first-child').text());

        // Mapping giải
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
                // Regex lấy số: bỏ hết ký tự không phải số
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

    // Duyệt qua tất cả bảng
    $('table.kqxs, .box_kqxs').each((_: any, tbl: any) => {
        const $tbl = $(tbl);
        // Lấy text header để nhận diện đài
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

// Hàm Main
export async function scrapeLotteryResults(stationCode: string, drawDate: string): Promise<LotteryResult[]> {
    const [year, month, day] = drawDate.split('-');
    const formattedDate = `${day}-${month}-${year}`;

    // 1. Thử Xoso.me
    try {
        const url = `https://xoso.me/xsmn-${formattedDate}.html`;
        console.log(`[Scraper] Fetching: ${url}`);
        const html = await fetchWithRotation(url);
        const $ = cheerio.load(html);
        const results = parseXosoMe($, stationCode, drawDate);
        if (results.length > 0) return results;
        console.log(`[Scraper] Xoso.me returned 0 results for ${stationCode}`);
    } catch (e: any) {
        console.warn('[Scraper] Xoso.me failed:', e.message);
    }

    // 2. Thử MinhNgoc
    try {
        const url = `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${formattedDate}.html`;
        console.log(`[Scraper] Fetching fallback: ${url}`);
        const html = await fetchWithRotation(url);
        const $ = cheerio.load(html);
        const results = parseMinhNgoc($, stationCode, drawDate);
        if (results.length > 0) return results;
        console.log(`[Scraper] MinhNgoc returned 0 results for ${stationCode}`);
    } catch (e: any) {
        console.warn('[Scraper] MinhNgoc failed:', e.message);
    }

    // Nếu cả 2 đều không có kết quả -> Throw để API trả về 503
    throw { code: ERROR_CODES.SCRAPE_FAILED };
}

export async function scrapeWithTimeout(stationCode: string, drawDate: string): Promise<LotteryResult[]> {
    return new Promise((resolve, reject) => {
        // Timeout cứng 15s
        const timer = setTimeout(() => {
            reject({ code: ERROR_CODES.SCRAPE_TIMEOUT });
        }, SCRAPE_TIMEOUT_MS);

        scrapeLotteryResults(stationCode, drawDate)
            .then(res => {
                clearTimeout(timer);
                resolve(res);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
}