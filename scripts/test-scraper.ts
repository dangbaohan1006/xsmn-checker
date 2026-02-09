
import { scrapeLotteryResults } from '../src/lib/scraper';

async function test() {
    try {
        console.log('Testing scraper for 2026-02-09...');
        // TP.HCM code is 'TP'
        const results = await scrapeLotteryResults('TP', '2026-02-09');
        console.log('Results found:', results.length);
        console.log(JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Scraper failed:', error);
    }
}

test();
