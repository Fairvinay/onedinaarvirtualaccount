
//import { launch } from 'puppeteer';


const puppeteer = require('puppeteer');

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
  
 //export default { fetchQuote :fetchQuote  , fetchQuoteold:fetchQuoteold };

 module.exports = {
    fetchQuote :fetchQuote ,
    fetchQuoteold:fetchQuoteold
 }