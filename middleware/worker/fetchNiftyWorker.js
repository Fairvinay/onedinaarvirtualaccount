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

async function parseNifty50() {

    const { symbol, maxRetries } = workerData;
    let browser;

    try {
        /* browser = await puppeteer.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        });*/
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

        /*const page = await browser.newPage();

        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
        );*/

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
        let data = {};
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
        await page.goto(
           `https://www.nseindia.com/index-tracker/${symbol}`,
            {
                waitUntil: "networkidle2",
                timeout: 60000
            }
        );

        await page.waitForSelector(
            ".index-tracker",
            { timeout: 30000 }
        );

        await page.waitForSelector(
            ".index-section",
            { timeout: 30000 }
        );

        await page.waitForSelector(
            ".index-detail-section",
            { timeout: 30000 }
        );

       data = await page.evaluate(() => {

            const safeText = (selector) => {
                try {
                    return (
                        document
                            .querySelector(selector)
                            ?.textContent
                            ?.trim() || null
                    );
                } catch {
                    return null;
                }
            };

            const safeAllText = (selector) => {
                try {
                    return Array.from(
                        document.querySelectorAll(selector)
                    )
                    .map(x => x.textContent?.trim())
                    .filter(Boolean);
                } catch {
                    return [];
                }
            };

            const getIndexValue = (labelName) => {
                try {

                    const items = document.querySelectorAll(
                        ".index-detail-section .index-item"
                    );

                    for (const item of items) {

                        const label =
                            item.querySelector(".index-label")
                                ?.textContent
                                ?.trim();

                        if (
                            label &&
                            label.startsWith(labelName)
                        ) {
                            return (
                                item.querySelector(".index-val")
                                    ?.textContent
                                    ?.trim() || null
                            );
                        }
                    }

                    return null;

                } catch {
                    return null;
                }
            };

            const getRangeValues = (sectionTitle) => {

                try {

                    const sections = document.querySelectorAll(
                        ".index-graph-section .col-xxl-6"
                    );

                    for (const section of sections) {

                        const title =
                            section.textContent || "";

                        if (
                            title.includes(sectionTitle)
                        ) {

                            const values =
                                section.querySelectorAll(
                                    ".range-value .fs-6"
                                );

                            return {
                                low:
                                    values[0]
                                        ?.textContent
                                        ?.trim() || null,

                                high:
                                    values[1]
                                        ?.textContent
                                        ?.trim() || null
                            };
                        }
                    }

                    return {
                        low: null,
                        high: null
                    };

                } catch {

                    return {
                        low: null,
                        high: null
                    };
                }
            };

            /* ----------------------------------
               Parse Index Dropdown
            ---------------------------------- */

            let nifty50Indices = [];

            try {

                nifty50Indices =
                    Array.from(
                        document.querySelectorAll(
                            ".index-tracker .dropdown .option"
                        )
                    )
                    .map(
                        el =>
                            el.textContent?.trim()
                    )
                    .filter(Boolean);

            } catch {
                nifty50Indices = [];
            }

            /* ----------------------------------
               Parse Symbol
            ---------------------------------- */

            const niftySymbol =
                safeText(
                    ".index-section .index"
                );

            /* ----------------------------------
               Spot
            ---------------------------------- */

            const nifty50Spot =
                safeText(
                    ".index-section .index-value"
                );

            /* ----------------------------------
               Prev Close / Open
            ---------------------------------- */

            const nifty50PreClose =
                getIndexValue("Prev. Close");

            const nifty50Open =
                getIndexValue("Open");

            const nifty50Advance =
                getIndexValue("Advance");

            const nifty50Decline =
                getIndexValue("Decline");

            /* ----------------------------------
               Points + Percent
            ---------------------------------- */

            let totalPoints = null;
            let totalPercent = null;

            try {

                const changeNode =
                    document.querySelector(
                        ".index-pchange"
                    );

                const txt =
                    changeNode?.textContent
                        ?.replace(/\s+/g, " ")
                        ?.trim() || "";

                const match =
                    txt.match(
                        /(-?\d+(?:\.\d+)?)\s*\((-?\d+(?:\.\d+)?)%\)/
                    );

                if (match) {

                    totalPoints =
                        match[1];

                    totalPercent =
                        match[2];
                }

            } catch {}

            /* ----------------------------------
               Week Range
            ---------------------------------- */

            const weekRange =
                getRangeValues("52 Week");

            const weekLow =
                weekRange.low;

            const weekHigh =
                weekRange.high;

            /* ----------------------------------
               Intraday Range
            ---------------------------------- */

            const intraRange =
                getRangeValues("Intraday");

            const intraDayLow =
                intraRange.low;

            const intraDayHigh =
                intraRange.high;

            return {

                indices:
                    nifty50Indices,

                symbol:
                    niftySymbol,

                latestPrice:
                    nifty50Spot,

                previousClose:
                    nifty50PreClose,

                open:
                    nifty50Open,

                shareadvance:
                    nifty50Advance,

                sharedecline:
                    nifty50Decline,

                point:
                    totalPoints,

                percent:
                    totalPercent,

                weeklow:
                    weekLow,

                weekhigh:
                    weekHigh,

                intradaylow:
                    intraDayLow,

                intradayhigh:
                    intraDayHigh
            };
        });

        console.log(
            JSON.stringify(
                data,
                null,
                2
            )
        );

        if (data.latestPrice) {
            parentPort.postMessage({ status: 'success', data });
            return; // Task complete
        }
       
        }
        catch (err) {
            console.log(`Worker Attempt ${attempt} failed for ${symbol}`);
        }


       }
       parentPort.postMessage({ status: 'failed', error: 'Max retries reached' });


       // return data;

    } catch (err) {

        console.error(
            "NSE Parse Error:",
            err
        );

        return {
            error: err.message
        };

    } finally {

        if (browser) {
            await browser.close();
        }
    }
}

parseNifty50();