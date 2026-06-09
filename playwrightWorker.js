const { workerData, parentPort } = require('worker_threads');
const {
    Worker, isMainThread,  
  } = require('node:worker_threads');
const { chromium } = require('playwright-extra');
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require('cheerio');
const stealth = require('puppeteer-extra-plugin-stealth')();
const store  = require( "store2");
const {   NseAllIndices } = require("./models/nseallindices")
//import { fileURLToPath } from 'node:url';
const fs =  require('node:fs');

let browserInstance = null;
let liveIndexTableHTML = "";
let liveIndicesData = [];
let i = 0;
let MAXWORKERTRIES = 2; 

//const outputFile = './playwrightworker_data.txt';
//const writeStream = fs.createWriteStream(outputFile, {
//    flags: 'a',
//  });
  const workerName = workerData.name;
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
// Example data update routine executed by your local data poller script
/* not updating or rather inserts blanck records 
  async function updateDatabaseIndex(scrapedDataCard) {
    await NseAllIndices.findOneAndUpdate(
        { name: scrapedDataCard.name }, // Matches document by its core name identity
        scrapedDataCard,                 // Pushes the fresh payload values directly
        { upsert: true, new: true }      // If it doesn't exist yet, insert it; otherwise, update it
    );
}*/
// Example data update routine executed by your local data poller script
async function updateDatabaseIndex(scrapedDataCard) {
    // Add the "return" keyword so the resolved document moves out of the function scope
    return await NseAllIndices.findOneAndUpdate(
        { name: scrapedDataCard.name }, 
        scrapedDataCard,                 
        { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true // Ensures schema defaults are initialized
        }
    );
}
// --- Replace your indicesData.forEach block with this safe sequential pattern ---

async function saveAllMarketIndices(indicesData) {
    // Elegant for...of structure natively supports async/await pauses
    for (const nseIndex of indicesData) {
        try {
            // Clone the index object clean framework references
            let newindices = Object.assign({}, nseIndex); 
            
            // Await the return payload properly
            const insertedNseRecord = await updateDatabaseIndex(newindices);
            
            console.log(`NSE Index processed in MongoDB: ${nseIndex.name}`);
            console.log(`Inserted Record: ${JSON.stringify(insertedNseRecord)}`);
            
            // If the record returns cleanly, write the real data to the stream logs
           // if (writeStream) { 
                const logTime = new Date().toLocaleString();
                 console.log(`[${logTime}] NSE Index transformTableToResponsiveCardsWithPoll:\r\n`);
                 console.log(`   Status: Database Upsert Confirmed\r\n`);
                console.log(`   Payload: ${JSON.stringify(insertedNseRecord)}\r\n\r\n`);
          //  }   

        } catch (error) {
            console.error(`Error upserting NSE Index ${nseIndex.name} record:`, error);
            
           // if (writeStream) { 
                const logTime = new Date().toLocaleString();
               console.log(`[${logTime}] NSE Index INSERT CRITICAL ERROR:\r\n`);
                 console.log(`   Target Index: ${nseIndex.name}\r\n`);
                 console.log(`   Message: ${error.message}\r\n\r\n`);
         //   }  
        }
    }
}
async function transformTableToResponsiveCardsWithPoll(rawTableHtml, isLocalRequest) {
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
     else {
        if(store!== undefined && store !==null){
             store.set('indicesData', indicesData);
             //check is a local server refresh and new indices have been parsed 
             if(isLocalRequest){
                // post the request to the server or the remote render.com 
                const targetUrl = process.env.SEND_INDICES_TO_SERVER;
                let saveDate = Date.now();
                await saveAllMarketIndices(indicesData) ;
               // EMPTY RECORD printed from below code 
              /*  indicesData.forEach(async (nseIndex )  => {
                  let newindices = Object.assign ({} , nseIndex); //  {  encodedHtml: encodedHtml , updatedAt:saveDate   }
                try { 
                 // Perform the upsert operation
                  // const insertedNseRecord = await NseAllIndices.findOneAndUpdate({}, newindices, {
                  //     upsert: true, // Inserts the document if it does not exist
                  //     new: true,    // Returns the newly updated/inserted document
                  //     setDefaultsOnInsert: true // Applies schema defaults if a new doc is created
                 //  });
                  //  
                      const insertedNseRecord =     updateDatabaseIndex(newindices);
                      console.log("NSE Index inserted in Mongo DB  :    " );
                   //  const decodedHtml = Buffer.from(latestRecord.encodedHtml, 'base64').toString('utf-8');
                       console.log(`NSE inserted record `)
                      console.log(` ${JSON.stringify(insertedNseRecord)}`)
                        if(writeStream !==undefined && writeStream !==null){ 
                            writeStream.write(`  ${Date.now().toLocaleString()} NSE Index  transformTableToResponsiveCardsWithPoll :    \r\n `);
                                writeStream.write(`    NSE Index inserted in Mongo DB  :    \r\n `);
                                writeStream.write(`   ${JSON.stringify(insertedNseRecord)}   \r\n `);
                        }  
                   //console.log(`${decodedHtml}` );
                   } catch (error) {
                        console.error(`Error upserting NSE Index ${nseIndex.name} record:`, error);
                       // if(writeStream !==undefined && writeStream !==null){ 
                            console.log(`  ${Date.now().toLocaleString()} NSE Index INSERT  ERROR :    \r\n `);
                             console.log(`  Error upserting NSE Index ${nseIndex.name} record: \r\n `, error );
                       // }  
                   }

                   } ); */
               /* sendRobustPostRequest(targetUrl, indicesData)
                .then(data => console.log('Parsed Server Yield:', data))
                .catch(() => console.log('Transaction halted. Local safeguards executed successfully.'));
                */
              




             }
        }
        else {
            console.log("store is not available at the server STORE2 package failed .... ")
          //  if(writeStream !==undefined && writeStream !==null){ 
                console.log(`  ${Date.now().toLocaleString()} NSE Index STORE  :    \r\n `);
                 console.log(` store is not available at the server STORE2 package failed ....  \r\n `  );
                 
           //    }  
        }
       
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
    liveIndicesData = indicesData;
 

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
async function fetchNiftyIndicesTPlayWright( maxRetries = 3) {

  let browser;
try {
  // Apply the stealth plugin
   // does not work in windows 
  chromium.use(stealth);
   // Launching with args to help in restricted environments , usually does not work on windoes 
   browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox',
            "--disable-dev-shm-usage",   // "--disable-blink-features=AutomationControlled"
              '--disable-web-security',
             '--disable-features=IsolateOrigins,site-per-process',
            '--blink-features=AutomationControlled', // Evades fundamental automated driver checking
            ]
      });
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ];
   const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent:userAgents[Math.floor(Math.random() * userAgents.length)],
          // 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          locale: 'en-US',
          timezoneId: 'Asia/Kolkata', // Matches target exchange operational parameters
      
        });  
       // usually does not work on windoes 
    const page = await context.newPage();
    console.log(" fetchNiftyIndicesTPlayWright with chromium and browser started")
    await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,all;q=0.8',
            'Referer': 'https://www.nseindia.com/',
            'Connection': 'keep-alive'
        });
        // Changes navigation timeout for this page to 60 seconds
    page.setDefaultNavigationTimeout(60000); 
    let data = {};
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              console.log("Priming security session via NSE home page...");
            await page.goto('https://www.nseindia.com/', { 
                waitUntil: 'domcontentloaded', 
               timeout: 30000 
              });

           // Introduce a human-like operational pause for cookies to settle
            await page.waitForTimeout(2500);   
            console.log("Navigating to target indices asset table...");
            await page.goto('https://www.nseindia.com/market-data/live-market-indices', {
                waitUntil: 'networkidle', // Wait for the data fetch to settle
                timeout: 145000
            });
                 // Navigate and wait for content
              //  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                console.log("fetchNiftyIndicesTPlayWright page.goto task over.");

            // Wait specifically for the internal content boxes to render in the DOM
            // Step 3: Wait cleanly for the correct element ID selector targeting
            console.log("Waiting for #liveindexTable to establish structural render...");
            await page.waitForSelector('#liveindexTable', { timeout: 160000 });
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
            console.log(` NIFTY LIVE MARKET  INDICES HTML `)
            console.log(`  ${ tableHTML}`);
             liveIndexTableHTML =  tableHTML
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
async function runPlaywright() {
    const { url } = workerData;
  parentPort.postMessage({ status: 'started', message: `Launching browser for ${url}` });
 // if(writeStream !==undefined && writeStream !==null){ 
    console.log(` [worker_write]${workerName} ${Date.now()}  Launching browser for ${url}  \r\n `);
//   }
  try {
     while (i < MAXWORKERTRIES ) {  
        let niftyIndices = await fetchNiftyIndicesTPlayWright(3)

        let latestLiveIndexResponsiveDash =  await        transformTableToResponsiveCardsWithPoll(niftyIndices ,true)
    // Send scrap data back to main thread
    // liveIndicesData = indicesData;
    liveIndexTableHTML  = latestLiveIndexResponsiveDash
    if (liveIndexTableHTML !=="" && liveIndicesData.length  > 0) { 

        console.log(" playwright worker seems to have parsed nify live indices ")
        if (isMainThread) {
        }
        else { 
        //    if(writeStream !==undefined && writeStream !==null){ 
           console.log(`[worker_write]${workerName} ${Date.now()}    playwright worker seems to have parsed nify live indices \r\n `);
            console.log(`   ${liveIndexTableHTML } \r\n`);

           console.log(`  ----------- \r\n`);
           console.log(`  -----------  \r\n`);
           console.log(`   ----------- \r\n `);

           console.log(`  ${JSON.stringify(liveIndicesData)} \r\n`);
       // }
        } 
        
        parentPort.postMessage({ status: 'success', data: { html: liveIndexTableHTML , indices : liveIndicesData } });
            break;
    }
      i= i+1;
      console.log(" playwright worker psring "+i+" time nify live indices ")

      if (isMainThread) {
       /* for( let k = 0; k < 10; k++) {
          const workerName = `worker_${k}`;
          const worker = new Worker(__filename, { workerData: workerName });
          writeStream.write(`[worker_created]${workerName}\r\n`);
        }*/
      } else {
      //  if(writeStream !==undefined && writeStream !==null){ 
         console.log(`[worker_started]${workerName}     playwright worker psring ${i} time nify live indices         \r\n`);
      //  }
      
      }





    }
   
  } catch (error) {
    parentPort.postMessage({ status: 'error', error: error.message });
   // if(writeStream !==undefined && writeStream !==null){ 
       console.log(`[worker_started]${workerName}     playwright worker   ${JSON.stringify( error.message)} \r\n`);
   // }
  } finally {
   // if(writeStream !==undefined && writeStream !==null){ 
       console.log(`[worker_write]${workerName} ${Date.now()}     [worker_finished]${workerName} \r\n`);
   // }
   // await browser.close();
    console.log('closeing the worker ')
    //process.exit(0); // Cleanly exit worker when task finishes
  }
}
//
runPlaywright();
