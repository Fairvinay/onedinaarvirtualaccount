
//import { launch } from 'puppeteer';


// const puppeteer = require('puppeteer');
const puppeteer = require("puppeteer-extra");
const { chromium } = require('playwright-extra');
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require('cheerio');
const stealth = require('puppeteer-extra-plugin-stealth')();
let browserInstance = null;

/**
 * Initializes the browser once and handles "zombie" process prevention
 */
async function getBrowser() {
    if (browserInstance) return browserInstance;

    console.log("🚀 Launching Global Browser Instance...");
    browserInstance = await puppeteer.launch({
        headless: "new",
        // Critical flags for Render.com/Linux environments
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage", // Uses disk instead of memory for temp files (saves RAM)
            "--disable-gpu",
            "--no-first-run",
            "--no-zygote",
            "--single-process" // Efficiency boost for low-resource environments
        ]
    });

    // Cleanup: Close browser if the Node process is killed (app shutdown)
    process.on('SIGINT', async () => {
        if (browserInstance) {
            await browserInstance.close();
            process.exit();
        }
    });

    return browserInstance;
}

//const cheerio = require('cheerio');

async function transformTableToResponsiveCards(rawTableHtml) {
    // Load the HTML DOM fragment into Cheerio
   
    const indicesData = [];
    let isFallbackState = false;


    // 1. CHEERIO EXCEPTION & EMPTY HTML HANDLING
    try {
      if (!rawTableHtml || typeof rawTableHtml !== 'string' || rawTableHtml.trim() === "") {
          throw new Error("Empty or invalid raw HTML input string received from scrap engine.");
      }

      const $ = cheerio.load(rawTableHtml);
      // Target table row extraction
      const rows = $('tr');
      if (rows.length === 0) {
          throw new Error("Cheerio loaded the fragment successfully, but found zero NIFTY INDICES elements.");
      }
    // Parse out data rows from the table structure
    $('tr').each((index, element) => {
        const row = $(element);
        const nameAnchor = row.find('td[headers*="indexCol"] a');
        
        if (nameAnchor.length > 0) {
            const indexName = nameAnchor.text().trim();
            
            // Extract text nodes safely via positional header mappings
            const current = row.find('td:nth-child(2)').text().trim();
            const percentChange = row.find('td:nth-child(3)').text().trim();
            const open = row.find('td:nth-child(4)').text().trim();
            const high = row.find('td:nth-child(5)').text().trim();
            const low = row.find('td:nth-child(6)').text().trim();
            const indicativeClose = row.find('td:nth-child(7)').text().trim();
            const prevClose = row.find('td:nth-child(8)').text().trim();
            const prevDay = row.find('td:nth-child(9)').text().trim();
            const oneWeekAgo = row.find('td:nth-child(10)').text().trim();
            const oneMonthAgo = row.find('td:nth-child(11)').text().trim();
            const oneYearAgo = row.find('td:nth-child(12)').text().trim();
            const yearHigh = row.find('td:nth-child(13)').text().trim();
            const yearLow = row.find('td:nth-child(14)').text().trim();

            // Determine trend context (positive/negative movement)
            const isNegative = row.find('td:nth-child(3)').hasClass('redTxt') || parseFloat(percentChange) < 0;

            indicesData.push({
                name: indexName,
                current,
                percentChange,
                open,
                high,
                low,
                indicativeClose: indicativeClose === '-' ? 'N/A' : indicativeClose,
                prevClose,
                prevDay,
                oneWeekAgo,
                oneMonthAgo,
                oneYearAgo,
                yearHigh,
                yearLow,
                isNegative
            });
        }
    });

     // Double check if data mapping actually succeeded
     if (indicesData.length === 0) {
      throw new Error("No qualifying indices rows matching standard selector criteria were processed.");
      }
     
    // Generate dynamic card elements
    /*const cardsMarkup = indicesData.map(item => {
        const trendColor = item.isNegative ? 'text-red-500' : 'text-emerald-500';
        const trendBg = item.isNegative ? 'bg-red-50/50' : 'bg-emerald-50/50';
        const trendBorder = item.isNegative ? 'border-red-100' : 'border-emerald-100';
        const trendIcon = item.isNegative ? '▼' : '▲';

        return `
        <div class="bg-white border ${trendBorder} rounded-2xl shadow-sm p-5 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between">
            
            <div>
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-sm font-bold text-slate-800 tracking-tight uppercase">${item.name}</h3>
                    <span class="flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${trendBg} ${trendColor}">
                        <span class="mr-1 text-[10px]">${trendIcon}</span> ${item.percentChange}%
                    </span>
                </div>
                
                <div class="text-2xl font-black tracking-tight text-slate-900 mb-4">
                    ${item.current}
                </div>
            </div>

            <div class="space-y-3.5 border-t border-slate-100 pt-4">
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="bg-slate-50 p-2 rounded-lg">
                        <span class="block text-[10px] uppercase font-semibold text-slate-400">Open</span>
                        <span class="text-xs font-bold text-slate-700">${item.open}</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded-lg">
                        <span class="block text-[10px] uppercase font-semibold text-slate-400">High</span>
                        <span class="text-xs font-bold text-slate-700 text-emerald-600">${item.high}</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded-lg">
                        <span class="block text-[10px] uppercase font-semibold text-slate-400">Low</span>
                        <span class="text-xs font-bold text-slate-700 text-red-600">${item.low}</span>
                    </div>
                </div>

                <div class="text-xs space-y-1.5 text-slate-600">
                    <div class="flex justify-between pb-1 border-b border-dashed border-slate-100">
                        <span class="text-slate-400 font-medium">Prev. Close</span>
                        <span class="font-semibold text-slate-700">${item.prevClose}</span>
                    </div>
                    <div class="flex justify-between pb-1 border-b border-dashed border-slate-100">
                        <span class="text-slate-400 font-medium">1W Ago <span class="text-[9px] text-slate-300">(29-May)</span></span>
                        <span class="font-semibold text-slate-700">${item.oneWeekAgo}</span>
                    </div>
                    <div class="flex justify-between pb-1 border-b border-dashed border-slate-100">
                        <span class="text-slate-400 font-medium">1M Ago <span class="text-[9px] text-slate-300">(05-May)</span></span>
                        <span class="font-semibold text-slate-700">${item.oneMonthAgo}</span>
                    </div>
                    <div class="flex justify-between pb-1 border-b border-dashed border-slate-100">
                        <span class="text-slate-400 font-medium">1Y Ago <span class="text-[9px] text-slate-300">(04-Jun)</span></span>
                        <span class="font-semibold text-slate-700">${item.oneYearAgo}</span>
                    </div>
                    <div class="flex justify-between pt-0.5">
                        <span class="text-slate-400 font-medium">52W High / Low</span>
                        <span class="font-bold text-slate-700 text-[11px]">
                            <span class="text-emerald-600">${item.yearHigh}</span> / <span class="text-red-500">${item.yearLow}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Inject compiled components directly into a unified standalone iframe layout template
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Indices Market Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Plus Jakarta Sans', sans-serif; }
            /// Custom sleek scrollbar for layout framework track container /
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        </style>
    </head>
    <body class="bg-slate-50 p-4 min-h-screen flex items-center justify-center">

        <div class="w-full max-w-7xl mx-auto">
            <div class="flex items-center justify-between mb-6 px-1">
                <div>
                    <h2 class="text-lg font-extrabold text-slate-900 tracking-tight">Market Indices Dashboard</h2>
                    <p class="text-xs text-slate-400 font-medium">Asynchronous Server Feed • Live Tracking</p>
                </div>
                <div class="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-emerald-200 uppercase tracking-wider">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>System Connected</span>
                </div>
            </div>

            <div id="deck-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                ${cardsMarkup}
            </div>
        </div>

    </body>
    </html>
    `; */
  } catch (error) {
    console.error(`🚨 Fallback Triggered: ${error.message}`);
    
    // Establish the exact 5 core indices requested as an explicit fallback state
    const fallbackSymbols = ["NIFTY 50", "NIFTY NEXT 50", "NIFTY BANK", "NIFTY FINANCIAL SERVICES", "NIFTY MIDCAP SELECT"];
    isFallbackState = true;
    
    indicesData = fallbackSymbols.map(symbol => ({
        name: symbol,
        current: 'N/A',
        percentChange: '0.00',
        open: 'N/A', high: 'N/A', low: 'N/A', indicativeClose: 'N/A',
        prevClose: 'N/A', oneWeekAgo: 'N/A', oneMonthAgo: 'N/A', oneYearAgo: 'N/A',
        yearHigh: 'N/A', yearLow: 'N/A',
        isNegative: false
    }));

 

}

// 2. MARKUP COMPILATION PIPELINE
    const cardsMarkup = indicesData.map(item => {
        // Fallback or neutral values get a slate theme instead of forcing a fake green trend
        const isNeutral = item.current === 'N/A';
        const trendColor = isNeutral ? 'text-slate-400' : (item.isNegative ? 'text-red-500' : 'text-emerald-500');
        const trendBg = isNeutral ? 'bg-slate-100' : (item.isNegative ? 'bg-red-50/50' : 'bg-emerald-50/50');
        const trendBorder = isNeutral ? 'border-slate-200' : (item.isNegative ? 'border-red-100' : 'border-emerald-100');
        const trendIcon = isNeutral ? '•' : (item.isNegative ? '▼' : '▲');

        return `
        <div class="bg-white border ${trendBorder} rounded-2xl shadow-sm p-5 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-sm font-bold text-slate-800 tracking-tight uppercase">${item.name}</h3>
                    <span class="flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${trendBg} ${trendColor}">
                        <span class="mr-1 text-[10px]">${trendIcon}</span> ${item.percentChange}%
                    </span>
                </div>
                <div class="text-2xl font-black tracking-tight text-slate-900 mb-4 ${isNeutral ? 'opacity-40' : ''}">
                    ${item.current}
                </div>
            </div>

            <div class="space-y-3.5 border-t border-slate-100 pt-4">
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="bg-slate-50 p-2 rounded-lg">
                        <span class="block text-[10px] uppercase font-semibold text-slate-400">Open</span>
                        <span class="text-xs font-bold text-slate-700">${item.open}</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded-lg">
                        <span class="block text-[10px] uppercase font-semibold text-slate-400">High</span>
                        <span class="text-xs font-bold ${isNeutral ? 'text-slate-700' : 'text-emerald-600'}">${item.high}</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded-lg">
                        <span class="block text-[10px] uppercase font-semibold text-slate-400">Low</span>
                        <span class="text-xs font-bold ${isNeutral ? 'text-slate-700' : 'text-red-600'}">${item.low}</span>
                    </div>
                </div>

                <div class="text-xs space-y-1.5 text-slate-600">
                    <div class="flex justify-between pb-1 border-b border-dashed border-slate-100">
                        <span class="text-slate-400 font-medium">Prev. Close</span>
                        <span class="font-semibold text-slate-700">${item.prevClose}</span>
                    </div>
                    <div class="flex justify-between pb-1 border-b border-dashed border-slate-100">
                        <span class="text-slate-400 font-medium">1W Ago</span>
                        <span class="font-semibold text-slate-700">${item.oneWeekAgo}</span>
                    </div>
                    <div class="flex justify-between pb-1 border-b border-dashed border-slate-100">
                        <span class="text-slate-400 font-medium">1M Ago</span>
                        <span class="font-semibold text-slate-700">${item.oneMonthAgo}</span>
                    </div>
                    <div class="flex justify-between pb-1 border-b border-dashed border-slate-100">
                        <span class="text-slate-400 font-medium">1Y Ago</span>
                        <span class="font-semibold text-slate-700">${item.oneYearAgo}</span>
                    </div>
                    <div class="flex justify-between pt-0.5">
                        <span class="text-slate-400 font-medium">52W High / Low</span>
                        <span class="font-bold text-slate-700 text-[11px]">
                            <span class="${isNeutral ? 'text-slate-700' : 'text-emerald-600'}">${item.yearHigh}</span> / 
                            <span class="${isNeutral ? 'text-slate-700' : 'text-red-500'}">${item.yearLow}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Conditional inclusion of the action-oriented recovery banner bottom button
    const recoveryButtonMarkup = isFallbackState ? `
    <div class="mt-8 flex flex-col items-center justify-center animate-fade-in">
        <p class="text-xs font-medium text-slate-400 mb-3">Live stream interrupted. Playground mode active.</p>
        <button 
            onclick="window.location.reload();" 
            class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs px-6 py-3 rounded-full shadow-md shadow-indigo-600/20 transition-all duration-200 cursor-pointer"
        >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"></path>
            </svg>
            FORCE REFRESH STREAM
        </button>
    </div>
    ` : '';

    const statusBadge = isFallbackState ? `
    <div class="flex items-center space-x-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-amber-200 uppercase tracking-wider">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        <span>Offline Playground Mode</span>
    </div>
    ` : `
    <div class="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-emerald-200 uppercase tracking-wider">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>System Connected</span>
    </div>
    `;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Indices Market Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Plus Jakarta Sans', sans-serif; }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        </style>
    </head>
    <body class="bg-slate-50 p-4 min-h-screen flex items-center justify-center">

        <div class="w-full max-w-7xl mx-auto">
            <div class="flex items-center justify-between mb-6 px-1">
                <div>
                    <h2 class="text-lg font-extrabold text-slate-900 tracking-tight">Market Indices Dashboard</h2>
                    <p class="text-xs text-slate-400 font-medium">Asynchronous Server Feed • Live Tracking</p>
                </div>
                ${statusBadge}
            </div>

            <div id="deck-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                ${cardsMarkup}
            </div>

            ${recoveryButtonMarkup}
        </div>

    </body>
    </html>
    `;


}

//module.exports = { transformTableToResponsiveCards };


/**
 * 
 * @param {*} symbol 
 * @param {*} maxRetries 
 * @returns 
 * Output Example
{
  "symbol": "RELIANCE",
  "latestPrice": "1,467.20",
  "companyName": "Reliance Industries Limited",
  "details": {
    "Prev. Close": "1,430.80",
    "Open": "1,433.40",
    "High": "1,467.40",
    "Low": "1,433.40",
    "Close *": "1,463.10",
    "VWAP": "1,453.99"
  }
}
 */


  async function fetchQuote(symbol = "RELIANCE", maxRetries = 3) {
    const url = `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`;
    const browser = await getBrowser();
    
    // Use a fresh incognito context to avoid cookie buildup/tracking
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    try {
        // Optimization: Block unneeded assets
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36");

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔁 Fetching ${symbol}: Attempt ${attempt}`);
                
                await page.goto(url, { 
                    waitUntil: "domcontentloaded", // Faster than networkidle2
                    timeout: 25000 
                });

                await page.waitForSelector(".symbol-value.norm-ltp", { timeout: 10000 });

                const data = await page.evaluate(() => {
                    const symbolText = document.querySelector(".symbol-value.norm-ltp .symbol-text")?.innerText.trim();
                    const latestPrice = document.querySelector(".symbol-value.norm-ltp .val")?.innerText.trim();
                    const rawCompany = document.querySelector("#top-section.companyName")?.innerText.trim();
                    const companyName = rawCompany ? rawCompany.split("(")[0].trim() : null;

                    const details = {};
                    document.querySelectorAll(".symbol-detail-section .symbol-container .symbol-item").forEach((node) => {
                        const label = node.querySelector(".symbol-label")?.innerText.trim();
                        const value = node.querySelector(".symbol-val")?.innerText.trim();
                        if (label && value) details[label] = value;
                    });

                    return { symbol: symbolText, latestPrice, companyName, details };
                });

                if (data?.latestPrice) return data;
                
            } catch (err) {
                console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
                if (attempt === maxRetries) throw err;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    } finally {
        // Close the page/context but keep the Browser alive
        await page.close();
        await context.close();
    }
}



/**
 * 
 * @param {*} symbol 
 * @param {*} maxRetries 
 * @returns 
 * Output Example
{
  "symbol": "RELIANCE",
  "latestPrice": "1,467.20",
  "companyName": "Reliance Industries Limited",
  "details": {
    "Prev. Close": "1,430.80",
    "Open": "1,433.40",
    "High": "1,467.40",
    "Low": "1,433.40",
    "Close *": "1,463.10",
    "VWAP": "1,453.99"
  }
}
 */
async function fetchNiftyQuoteold(symbol = "RELIANCE", maxRetries = 3) {
  
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
               const details = {};

               details['indices'] = nifty50Indices;
                details['previousClose'] = nifty50PreClose;
                 details['open'] =nifty50Open ;
                  details['shareadvance'] = nifty50Advance;
                   details['sharedecline'] = nifty50Decline;
                    details['point'] = totalPoints;
                     details['percent'] = totalPercent;
                      details['weeklow'] = weekLow;
                  details['weekhigh'] = weekHigh;
                  details['intradaylow'] = intraDayLow;
                  details['intradayhigh'] = intraDayHigh;   

                   details['Open'] = nifty50Open ;
                    details['Low'] = intraDayLow;
                     details['High'] = intraDayHigh; 
              details["Close *"] = nifty50PreClose; 
                    details['52W H'] = weekHigh;
             
                    details['52W L'] = weekLow;
            



              return {
  
           
                  symbol:
                      niftySymbol,
  
                  latestPrice:
                      nifty50Spot,

                  companyName: niftySymbol, 

                  details: details
  
               
              };
          });
  
          console.log(
              JSON.stringify(
                  data,
                  null,
                  2
              )
          );
  
          if (data && data.latestPrice && data.symbol) {
            console.log("✅ Success:", data.symbol);
            return data;
        }
         
          }
          catch (err) {
            console.error(`⚠️ Attempt ${attempt} failed: ${err.message}`);
            
            // If it's the last attempt, don't just log, throw it
            if (attempt === maxRetries) throw new Error("Max retries reached");
            
            // ✅ FIX 3: Clear page state before retry (optional but safer)
            await page.goto('about:blank'); 
          }
        
         // Wait before retrying
           await new Promise(res => setTimeout(res, 2000));
  
  
         }
        /// parentPort.postMessage({ status: 'failed', error: 'Max retries reached' });
  
  
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

 async function fetchQuoteold(symbol = "RELIANCE", maxRetries = 3) {
    const url = `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`;
  
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
  
      const page = await browser.newPage();
  
      // 👇 Important headers (NSE blocks bots)
      await page.setExtraHTTPHeaders({
        "accept-language": "en-US,en;q=0.9"
      });
  
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
      );


      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔁 Attempt ${attempt}`);

            // Use a shorter timeout for the actual navigation
            await page.goto(url, {
                waitUntil: "domcontentloaded", 
                timeout: 20000 
            });

            await page.waitForSelector(".symbol-value.norm-ltp", { timeout: 10000 });

            const data = await page.evaluate(() => {
                const symbolText = document.querySelector(".symbol-value.norm-ltp .symbol-text")?.innerText.trim();
                const latestPrice = document.querySelector(".symbol-value.norm-ltp .val")?.innerText.trim();
                const rawCompany = document.querySelector("#top-section.companyName")?.innerText.trim();
                const companyName = rawCompany ? rawCompany.split("(")[0].trim() : null;

                const detailNodes = document.querySelectorAll(".symbol-detail-section .symbol-container .symbol-item");
                const details = {};
                detailNodes.forEach((node) => {
                    const label = node.querySelector(".symbol-label")?.innerText.trim();
                    const value = node.querySelector(".symbol-val")?.innerText.trim();
                    if (label && value) details[label] = value;
                });

                return { symbol: symbolText, latestPrice, companyName, details };
            });

            if (data && data.latestPrice && data.symbol) {
                console.log("✅ Success:", data.symbol);
                return data;
            }
        } catch (err) {
            console.error(`⚠️ Attempt ${attempt} failed: ${err.message}`);
            
            // If it's the last attempt, don't just log, throw it
            if (attempt === maxRetries) throw new Error("Max retries reached");
            
            // ✅ FIX 3: Clear page state before retry (optional but safer)
            await page.goto('about:blank'); 
        }
        
        // Wait before retrying
        await new Promise(res => setTimeout(res, 2000));
    }
         /* Extra Stability (Highly Recommended)

Add this before goto():*/
  /*
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔁 Attempt ${attempt}`);
        await page.setViewport({ width: 1366, height: 768 });
        await page.setRequestInterception(true);
        page.on('request', (req) => {
        if (["image", "stylesheet", "font"].includes(req.resourceType())) {
            req.abort(); // speed optimization
        } else {
            req.continue();
        }
        });
          await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: 30000
          });
            // ✅ Wait for main container
          await page.waitForSelector(".symbol-value.norm-ltp", { timeout: 10000 });
          await page.waitForSelector(".symbol-detail-section", { timeout: 10000 });
            const data = await page.evaluate(() => {
            // --- TOP SECTION ---
            const symbolText = document.querySelector(
              ".symbol-value.norm-ltp .symbol-text"
            )?.innerText.trim();
  
            const latestPrice = document.querySelector(
              ".symbol-value.norm-ltp .val"
            )?.innerText.trim();
              // --- COMPANY NAME ---
            const rawCompany = document.querySelector(
              "#top-section.companyName"
            )?.innerText.trim();
              const companyName = rawCompany
              ? rawCompany.split("(")[0].trim()
              : null;
              // --- DETAILS ---
            const detailNodes = document.querySelectorAll(
              ".symbol-detail-section .symbol-container .symbol-item"
            );
              const details = {};
              detailNodes.forEach((node) => {
              const label = node.querySelector(".symbol-label")?.innerText.trim();
              const value = node.querySelector(".symbol-val")?.innerText.trim();
              if (label && value) {
                details[label] = value;
              }
            });
              return {
              symbol: symbolText,
              latestPrice,
              companyName,
              details
            };
          });
            // ✅ Validate result
          if (data && data.latestPrice && data.symbol) {
            console.log("✅ Success:", data);
            return data;
          }
           console.log("⚠️ Incomplete data, retrying...");
        } catch (err) {
          console.log(`❌ Attempt ${attempt} failed:`, err.message);
        }
         // small delay before retry
        await new Promise((res) => setTimeout(res, 2000));
      }
      */
    //  throw new Error("❌ Failed after retries");
  
    } finally {
      if (browser) await browser.close();
    }
  }
  

 /**
  * NSEINDINA Home page indices 
  * 
  * 
  *  */
 async function fetchNiftyIndices( maxRetries = 3) {

    let browser;
  try {
    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({
      headless: true, // or 'new'
      args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process'
      ]
  });
  
  
  /*  const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage"   // "--disable-blink-features=AutomationControlled"
        ]
    });*/
    console.log(" fetchNiftyIndices with pupeteer and browser started")
        // browser = await puppeteer.launch({
        //       headless: "new",
        //       args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        //   });
  
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
                     `https://www.nseindia.com`,
                      {
                          waitUntil: "networkidle2",
                          timeout: 60000
                      }
                  );

                  console.log(" fetchNiftyIndices page.goto task over ")
                        await page.waitForFunction(
                            () => document.querySelectorAll(
                              ".indices_section  .slick-list"  // tab-item active owl-carousel .owl-item //  ".indices_details"
                            ).length > 0,
                            {
                                timeout: 60000
                            }
                            );
                            console.log(" fetchNiftyIndices waitForFunction  .indices_section  .slick-list  OVER  ")         
                    // await page.waitForSelector(
                    //           ".indices-section .slick-track",
                    //           {
                    //             visible: true,
                    //             timeout: 30000
                    //           }
                    // );

                  await page.waitForFunction(() => {
                    return document.querySelectorAll(
                      ".indices-section .slick-track .slick-slide"
                    ).length > 0;
                  });

                  console.log(" fetchNiftyIndices waitForFunction  .indices-section .slick-track .slick-slide  OVER  ")       

                   // tab-item  owl-carousel .owl-item
                   await page.waitForFunction(() => {
                    return document.querySelectorAll(
                      ".tab-item .owl-carousel .owl-item"
                    ).length > 0;
                  });

                  console.log(" fetchNiftyIndices waitForFunction .tab-item .owl-carousel .owl-item   OVER  ")       

                const niftyIndices = await page.evaluate(() => {

                  const results = [];

                  try {

                    // const slides = Array.from(
                    //   document.querySelectorAll(
                    //     ".indices-section .slick-track .slick-slide"
                    //   )
                    // );
                    const slides = Array.from(
                      document.querySelectorAll(
                        ".slick-cloned .slick-slide"
                      )
                    );

                    console.log(" fetchNiftyIndices slides  fOUND  "+Arrays.isArray(slides))       

                    for (const slide of slides) {

                      try {

                        //-------------------------------------------------
                        // Ignore cloned slides
                        //-------------------------------------------------

                        if (
                          slide.classList.contains("slick-cloned")
                        ) {
                          continue;
                        }

                        const dataIndex =
                          parseInt(
                            slide.getAttribute("data-index") || "-1",
                            10
                          );

                        if (dataIndex < 0) {
                          continue;
                        }

                        //-------------------------------------------------
                        // Locate card
                        //-------------------------------------------------

                        const card = slide.querySelector(
                          ".item .indices_details .text-start"
                        );

                        if (!card) {
                          continue;
                        }
                        console.log(" fetchNiftyIndices card  fOUND  " )       
                        //-------------------------------------------------
                        // Symbol
                        //-------------------------------------------------

                        const symbol =
                          card.querySelector(".symbol")
                            ?.textContent
                            ?.trim() || "";

                        //-------------------------------------------------
                        // Value
                        //-------------------------------------------------
                        console.log(" fetchNiftyIndices symbol  fOUND  " )       
                        const value =
                          card.querySelector(".value")
                            ?.textContent
                            ?.trim() || "";

                        //-------------------------------------------------
                        // Change
                        //-------------------------------------------------
                        console.log(" fetchNiftyIndices value  fOUND  " )       
                        const chng =
                          card.querySelector(".chng")
                            ?.textContent
                            ?.trim() || "";

                        //-------------------------------------------------
                        // Skip bad records
                        //-------------------------------------------------
                        console.log(" fetchNiftyIndices chng  fOUND  " )       
                        if (!symbol) {
                          continue;
                        }

                        results.push({
                          symbol,
                          value,
                          chng
                        });
                        console.log(" fetchNiftyIndices results  fOUND  "+JSON.stringify(results) )       


                      } catch (err) {
                        console.error(
                          "Error parsing slide",
                          err
                        );
                      }
                    }

                  } catch (err) {
                    console.error(
                      "Error parsing indices section",
                      err
                    );
                  }

                  return results;
                });
                   console.log(
                    JSON.stringify(
                      niftyIndices,
                        null,
                        2
                    )
                );
              if (niftyIndices &&  Arrays.isArray(niftyIndices) && niftyIndices[0].symbol) {
                  console.log("✅ Success:", niftyIndices.length);
                  return niftyIndices;
              }

            }
          catch (err) {
            console.error(`⚠️ Attempt ${attempt} failed: ${err.message}`);
                 // If it's the last attempt, don't just log, throw it
            if (attempt === maxRetries) throw new Error("Max retries reached");
            
            // ✅ FIX 3: Clear page state before retry (optional but safer)
              await page.goto('about:blank'); 
             }
        
         // Wait before retrying
           await new Promise(res => setTimeout(res, 2000));
  
  
         }

  } catch (error) {

    console.error(
      "NSE Indices Parsing Error:",
      error.message
    );

    return [];
  }
   finally {
      if (browser) await browser.close();
    }




}
async function fetchNiftyIndicesSecond( maxRetries = 3) {

  let browser;
try {
  puppeteer.use(StealthPlugin());

  const browser = await puppeteer.launch({
    headless: true, // or 'new'
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
    ]
});

  /* const browser = await puppeteer.launch({
      headless: true,
      args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage"   // "--disable-blink-features=AutomationControlled"
      ]
  });*/
  console.log(" fetchNiftyIndicesSecond with pupeteer and browser started")
      // browser = await puppeteer.launch({
      //       headless: "new",
      //       args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      //   });

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
                   `https://www.nseindia.com`,
                    {
                        waitUntil: "networkidle2",
                        timeout: 60000
                    }
                );

                console.log("fetchNiftyIndicesSecond page.goto task over.");

            // Wait specifically for the internal content boxes to render in the DOM
          //  await page.waitForSelector('.tab-item .owl-carousel .owl-item', { timeout: 60000 });
            await page.waitForSelector('.value .withoutstreaming', { timeout: 60000 });

            // Extract indices directly from the browser window context
            // const niftyIndices = await page.evaluate(() => {
            //     const results = [];
            //     const seenSymbols = new Set();
                
            //     // Querying all container details boxes inside the indices section
            //     const cards = document.querySelectorAll('.tab-item .owl-carousel .owl-item');

            //     cards.forEach(card => {
            //         const symbolEl = card.querySelector('.symbol');
            //         const valueEl = card.querySelector('.value');
            //         const chngEl = card.querySelector('.chng');

            //         if (symbolEl && valueEl && chngEl) {
            //             const symbol = symbolEl.textContent.trim();
            //             const value = valueEl.textContent.trim();
            //             const chng = chngEl.textContent.trim();

            //             // Unique constraint: filters out slider clones (e.g., repeating NIFTY 50 nodes)
            //             if (!seenSymbols.has(symbol) && symbol !== "") {
            //                 seenSymbols.add(symbol);
            //                 results.push({ symbol, value, chng });
            //             }
            //         }
            //     });

            //     return results;
            // });
            const niftyIndices = await page.evaluate(() => {
              const results = [];
              const seenSymbols = new Set();
              
              // Querying all container details boxes inside the indices section
              const niftyStreamig = document.querySelectorAll('.value .withoutstreaming');
              const value =    niftyStreamig.textContent.trim();
                  results.push({ symbol : 'NIFTY-50', value  });
               

              return results;
          });
            console.log(`Successfully extracted ${niftyIndices.length} items.`);
            return niftyIndices;

          }
        catch (err) {
          console.error(`⚠️ Attempt ${attempt} failed: ${err.message}`);
               // If it's the last attempt, don't just log, throw it
          if (attempt === maxRetries) throw new Error("Max retries reached");
          
          // ✅ FIX 3: Clear page state before retry (optional but safer)
            await page.goto('about:blank'); 
           }
      
       // Wait before retrying
         await new Promise(res => setTimeout(res, 2000));


       }

} catch (error) {

  console.error(
    "NSE Indices Parsing Error:",
    error.message
  );

  return [];
}
 finally {
    if (browser) await browser.close();
  }




}
async function fetchNiftyIndicesThird( maxRetries = 3) {

  let browser;
try {
  // Apply the stealth plugin
   // does not work in windows 
  //chromium.use(stealth);
  puppeteer.use(StealthPlugin());
        browser = await puppeteer.launch({
         headless: true,
        args: [
            "--no-sandbox",
              "--disable-setuid-sandbox",
            "--disable-dev-shm-usage"   // "--disable-blink-features=AutomationControlled"
         ]
       });
         // Launching with args to help in restricted environments
   /*  // does not work in windows  
     browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox',
            "--disable-dev-shm-usage"   // "--disable-blink-features=AutomationControlled"
          ]
      });
      
      const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }); */
       // does not work in windows 
     // const page = await context.newPage();
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


     


      // const browser = await puppeteer.launch({
      //     headless: true,
      //     args: [
      //         "--no-sandbox",
      //         "--disable-setuid-sandbox",
      //         "--disable-dev-shm-usage"   // "--disable-blink-features=AutomationControlled"
      //     ]
      // });
      console.log(" fetchNiftyIndicesThird with pupeteer and browser started")
      // browser = await puppeteer.launch({
      //       headless: "new",
      //       args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      //   });

     //   const page = await browser.newPage();


     

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
        // not working with playwright launched page  this method
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
                   `https://www.nseindia.com/market-data/live-market-indices`,
                    {
                        waitUntil: "networkidle2",
                        timeout: 60000
                    }
                );
                 // Navigate and wait for content
              //  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                console.log("fetchNiftyIndicesThird page.goto task over.");

            // Wait specifically for the internal content boxes to render in the DOM
          //  await page.waitForSelector('.tab-item .owl-carousel .owl-item', { timeout: 60000 });
            // Step 3: Wait cleanly for the correct element ID selector targeting
            console.log("Waiting for #liveindexTable to establish structural render...");
            await page.waitForSelector('#liveindexTable', { timeout: 60000 });

            // Extract indices directly from the browser window context
            // const niftyIndices = await page.evaluate(() => {
            //     const results = [];
            //     const seenSymbols = new Set();
                
            //     // Querying all container details boxes inside the indices section
            //     const cards = document.querySelectorAll('.tab-item .owl-carousel .owl-item');

            //     cards.forEach(card => {
            //         const symbolEl = card.querySelector('.symbol');
            //         const valueEl = card.querySelector('.value');
            //         const chngEl = card.querySelector('.chng');

            //         if (symbolEl && valueEl && chngEl) {
            //             const symbol = symbolEl.textContent.trim();
            //             const value = valueEl.textContent.trim();
            //             const chng = chngEl.textContent.trim();

            //             // Unique constraint: filters out slider clones (e.g., repeating NIFTY 50 nodes)
            //             if (!seenSymbols.has(symbol) && symbol !== "") {
            //                 seenSymbols.add(symbol);
            //                 results.push({ symbol, value, chng });
            //             }
            //         }
            //     });

            //     return results;
            // });
            // Step 4: Isolate and extract just the inner HTML string of that single element layout
            const tableHTML = await page.evaluate(async () => {
              const tableElement = document.querySelector('#liveindexTable');

              // Error Attempt 3 failed: transformTableToResponsiveCards is not defined
            //   const tailWindTransformed  =  await   transformTableToResponsiveCards(tableElement.outerHTML)
              // Move it to market.js 





             // return tailWindTransformed ? tailWindTransformed : null;
              return tableElement ? tableElement.outerHTML : null;
            });

            if (!tableHTML) {
                throw new Error("Target #liveindexTable selector isolated successfully, but contained a null inner body.");
            }

            console.log("⚡ Success! Raw DOM structure safely retrieved.");
            return tableHTML;

          }
        catch (err) {
          console.error(`⚠️ Attempt ${attempt} failed: ${err.message}`);
               // If it's the last attempt, don't just log, throw it
          if (attempt === maxRetries) throw new Error("Max retries reached");
          
          // ✅ FIX 3: Clear page state before retry (optional but safer)
            await page.goto('about:blank'); 
           }
      
       // Wait before retrying
         await new Promise(res => setTimeout(res, 2000));


       }

} catch (error) {

  console.error(
    "NSE Indices Parsing Error:",
    error.message
  );

  return [];
}
 finally {
    if (browser) await browser.close();
  }




}
 //export default { fetchQuote :fetchQuote  , fetchQuoteold:fetchQuoteold };

 module.exports = {
    fetchQuote :fetchQuote ,
    fetchQuoteold:fetchQuoteold,
    fetchNiftyQuoteold:fetchNiftyQuoteold,
    fetchNiftyIndices:fetchNiftyIndices,
    fetchNiftyIndicesSecond:fetchNiftyIndicesSecond,
    fetchNiftyIndicesThird:fetchNiftyIndicesThird,
 }
