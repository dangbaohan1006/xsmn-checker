
async function test() {
    const urls = [
        'https://xoso.me/xsmn-09-02-2026.html',
        'https://xoso.me/xsmn-09-02-2026',
        'https://xoso.me/mien-nam/xsmn-ngay-09-02-2026.html',
        'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/09-02-2026.html',
        'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/09-02-2026',
    ];

    for (const url of urls) {
        try {
            console.log(`Fetching ${url}...`);
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            console.log('Status:', res.status);
        } catch (error: any) {
            console.error(`Error fetching ${url}:`, error.message);
        }
    }
}
test();
