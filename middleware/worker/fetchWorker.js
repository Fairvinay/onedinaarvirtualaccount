const { parentPort, workerData } = require('worker_threads');
const puppeteer = require('puppeteer');

async function runScraper() {
    const { symbol, maxRetries } = workerData;
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        });

        const page = await browser.newPage();


        // 1. ADD RANDOMIZED VIEWPORT & EMULATE HUMAN
        await page.setViewport({ 
            width: 1280 + Math.floor(Math.random() * 100), 
            height: 800 + Math.floor(Math.random() * 100) 
        });

        // 2. USE A ROTATING USER AGENT
        const userAgents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ];
        await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);

        // 3. SET NSE-SPECIFIC HEADERS (Crucial for bypass)
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,all;q=0.8',
            'Referer': 'https://www.nseindia.com/',
            'Connection': 'keep-alive'
        });

        await page.setRequestInterception(true);
        
        page.on('request', (req) => {
            if (req.isInterceptResolutionHandled()) return;
            if (["image", "stylesheet", "font"].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await page.goto(`https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`, {
                    waitUntil: "domcontentloaded",
                    timeout: 20000
                });

                await page.waitForSelector(".symbol-value.norm-ltp", { timeout: 10000 });

                const data = await page.evaluate(() => {
                    return {
                        symbol: document.querySelector(".symbol-text")?.innerText.trim(),
                        latestPrice: document.querySelector(".symbol-value.norm-ltp .val")?.innerText.trim()
                    };
                });

                if (data.latestPrice) {
                    parentPort.postMessage({ status: 'success', data });
                    return; // Task complete
                }
            } catch (err) {
                console.log(`Worker Attempt ${attempt} failed for ${symbol}`);
            }
        }
        parentPort.postMessage({ status: 'failed', error: 'Max retries reached' });
    } catch (error) {
        parentPort.postMessage({ status: 'error', error: error.message });
    } finally {
        if (browser) await browser.close();
    }
}

runScraper();