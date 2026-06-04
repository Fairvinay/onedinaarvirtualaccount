
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
  
 //export default { fetchQuote :fetchQuote  , fetchQuoteold:fetchQuoteold };

 module.exports = {
    fetchQuote :fetchQuote ,
    fetchQuoteold:fetchQuoteold,
    fetchNiftyQuoteold:fetchNiftyQuoteold
 }
