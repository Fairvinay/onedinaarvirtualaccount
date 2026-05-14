//quoteService.js

const { Worker } = require('worker_threads');
const path = require('path');


// In-memory cache to save RAM
const priceCache = {}; 
const CACHE_DURATION = 2 * 60 * 1000; // 2 Minutes


/**
 * Checks if NSE Market is open (Mon-Fri, 9:15 AM - 3:30 PM IST)
 */
function isMarketOpen() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    
    const day = istTime.getUTCDay();
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;

    // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) return false;

    // 9:15 AM is 555 mins, 3:30 PM is 930 mins
    return currentTimeInMinutes >= 555 && currentTimeInMinutes <= 930;
}



/**
 * Launches parallel workers to fetch a quote.
 * @param {string} symbol - Stock symbol
 * @param {number} workerCount - How many parallel workers to race
 */
async function getQuoteWithWorkersold(symbol, workerCount = 2) {
    return new Promise((resolve, reject) => {
        let completed = false;
        const workers = [];

        const cleanup = () => {
            completed = true;
            workers.forEach(w => w.terminate()); // Kill all other busy workers
        };

        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker(path.join(__dirname, 'worker/fetchWorker.js'), {
                workerData: { symbol, maxRetries: 3 }
            });

            workers.push(worker);

            worker.on('message', (msg) => {
                if (msg.status === 'success' && !completed) {
                    cleanup();
                    resolve(msg.data);
                }
            });

            worker.on('error', (err) => {
                console.error("Worker Error:", err);
            });

            worker.on('exit', (code) => {
                if (code !== 0 && !completed) {
                    // Check if all workers failed
                    if (workers.every(w => w.threadId === -1)) {
                        reject(new Error("All workers failed to fetch data"));
                    }
                }
            });
        }

        // Global safety timeout (e.g., 60 seconds total)
        setTimeout(() => {
            if (!completed) {
                cleanup();
                reject(new Error("Timeout: Workers took too long"));
            }
        }, 60000);
    });
}

// Example usage in your Express Route:
// const data = await getQuoteWithWorkers('RELIANCE', 2);
 
const getQuoteWithWorkers = (symbol , workerCount = 2 ) => {
    return new Promise((resolve, reject) => {


        // 1. Check Cache first
        const cachedData = priceCache[symbol];
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
            console.log(`💾 Serving ${symbol} from Cache`);
            return resolve(cachedData.data);
        }

        // 2. If Market is closed and we have ANY data, don't scrape
        if (!isMarketOpen() && cachedData) {
            console.log(`🌙 Market Closed. Serving last known price for ${symbol}`);
            return resolve(cachedData.data);
        }

        // 3. Start the Scraper (ONLY if necessary)
        let finished = false;
        // REDUCED TO 1 WORKER: Racing 2 workers is likely what's killing your RAM
        const worker = new Worker(path.join(__dirname, 'worker/fetchWorker.js'), {
            workerData: { symbol, maxRetries: 2 }
        });

        const cleanup = () => {
            finished = true;
            worker.terminate();
        };

        worker.on('message', (msg) => {
            if (msg.status === 'success' && !finished) {
                // Update Cache
                priceCache[symbol] = { data: msg.data, timestamp: Date.now() };
                cleanup();
                resolve(msg.data);
            }
        });

        worker.on('error', (err) => { cleanup(); reject(err); });
        
        worker.on('exit', (code) => {
            if (code !== 0 && !finished) reject(new Error("Worker failed"));
        });

        // 45s Hard Timeout
        setTimeout(() => { if (!finished) { cleanup(); reject(new Error("Timeout")); } }, 45000);


       /*  EARLIER 2 WORKER CODE   GARBABE COLLECTION STARTED 
        let completed = false;
        const workers = [];

        const cleanup = () => {
            completed = true;
            workers.forEach(w => w.terminate()); // Kill all other busy workers
        };

        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker(path.join(__dirname, 'worker/fetchWorker.js'), {
                workerData: { symbol, maxRetries: 3 }
            });

            workers.push(worker);

            worker.on('message', (msg) => {
                if (msg.status === 'success' && !completed) {
                    cleanup();
                    resolve(msg.data);
                }
            });

            worker.on('error', (err) => {
                console.error("Worker Error:", err);
            });

            worker.on('exit', (code) => {
                if (code !== 0 && !completed) {
                    // Check if all workers failed
                    if (workers.every(w => w.threadId === -1)) {
                        reject(new Error("All workers failed to fetch data"));
                    }
                }
            });
        }

        // Global safety timeout (e.g., 60 seconds total)
        setTimeout(() => {
            if (!completed) {
                cleanup();
                reject(new Error("Timeout: Workers took too long"));
            }
        }, 60000);
        */
    });
}; 

// Use an object export
module.exports = { getQuoteWithWorkers };

