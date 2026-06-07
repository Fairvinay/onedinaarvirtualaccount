const express = require('express');
const axios = require('axios');
const _ = require("lodash");
const store  = require( "store2");
const router = express.Router();
const TradeOrder = require('../models/tradeorder'); // Path to your schema
//const fetchQuote = require('./fetchQuote'); // Path to your puppeteer fetch 
//const fetchQuoteold = require('./fetchQuote'); // Path to your puppeteer fetch 
const { getQuoteWithWorkers } = require('../middleware/quoteService');
const { fetchQuote , fetchQuoteold , fetchNiftyQuoteold  }  = require('./fetchQuote');
const {   fetchNiftyIndices , fetchNiftyIndicesSecond , fetchNiftyIndicesThird ,
    fetchNiftyIndicesTPlayWright, fetchNiftyIndicesDirectAPI
}  = require('./fetchNiftyIndicesQuote');
const cheerio = require('cheerio');
   const globalStore =
   require("../globalStore");



const URLS = {
    AP1 : 'https://api-nse-india-vbmd.onrender.com', // 'https://scraper-api-eyiz.onrender.com' 
    AP2 :  'https://query1.finance.yahoo.com', // 'https://feedsmain.onrender.com'https://artilleryfeed2.onrender.com'
}
 
// use this https://auth.iextrading.com/?r=https%3A%2F%2Fiextrading.com%2Faccount%2F#/
// create account https://auth.iextrading.com/?r=https%3A%2F%2Fiextrading.com%2Faccount%2F#/register

// use this https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=demo
/*
{
  "Meta Data": {
    "1. Information": "Intraday (5min) open, high, low, close prices and volume",
    "2. Symbol": "IBM",
    "3. Last Refreshed": "2026-04-02 19:55:00",
    "4. Interval": "5min",
    "5. Output Size": "Compact",
    "6. Time Zone": "US/Eastern"
  },
  "Time Series (5min)": {
    "2026-04-02 19:55:00": {
      "1. open": "248.3900",
      "2. high": "248.3900",
      "3. low": "248.2100",
      "4. close": "248.3000",
      "5. volume": "86"
    },
    "2026-04-02 19:45:00": {
      "1. open": "248.2100",
      "2. high": "248.2300",
      "3. low": "248.2100",
      "4. close": "248.2300",
      "5. volume": "21"
    },
....
....
   "2026-04-02 11:40:00": {
      "1. open": "246.1350",
      "2. high": "246.2898",
      "3. low": "245.8100",
      "4. close": "246.2200",
      "5. volume": "18020"
    },
    "2026-04-02 11:35:00": {
      "1. open": "246.3900",
      "2. high": "246.6400",
      "3. low": "245.9450",
      "4. close": "246.1100",
      "5. volume": "28181"
    },
    "2026-04-02 11:30:00": {
      "1. open": "246.6200",
      "2. high": "246.6226",
      "3. low": "246.1050",
      "4. close": "246.3300",
      "5. volume": "25699"
    }
  }
}

*/

/** 
 * 
 * 
 * 
 */

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
     else {
        if(store!== undefined && store !==null){
             store.set('indicesData', indicesData);
        }
        else {
            console.log("store is not available at the server STORE2 package failed .... ")
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
/**
 * Sends a robust POST request with complete exception breakdown.
 * @param {string} url - Target endpoint URI.
 * @param {Object} payload - The JSON body payload to transmit.
 */
async function sendRobustPostRequest(url, payload) {
    // Use AbortController for clean network timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second ceiling
  
    try {
      const config = {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };
      let jsonPayLoad = JSON.stringify(payload);
      console.log(`Initiating POST request to: ${url}`);
      const response = await axios.post(url, jsonPayLoad, config);
      
      // Clear timeout upon successful resolution
      clearTimeout(timeoutId);
      
      console.log('Request completed successfully!');
      return response.data;
  
    } catch (error) {
      // Clear timeout inside the catch block to prevent memory leaks
      clearTimeout(timeoutId);
  
      // Differentiate native Axios exceptions from standard JS engine errors
      if (axios.isAxiosError(error)) {
        handleAxiosSpecificError(error);
      } else {
        handleNativeError(error);
      }
      
      // Bubble up or return a structured fault object depending on your architectural needs
      throw new Error('API_TRANSACTION_FAILED');
    }
  }
  
  /**
   * Parses and processes explicit failures returned or caused by Axios
   */
  function handleAxiosSpecificError(error) {
    if (error.response) {
      // Scenario A: Server received request and responded with a bad status code (4xx, 5xx)
      console.error(`[API Error] Received response status: ${error.response.status}`);
      console.error('[API Error Data]:', JSON.stringify(error.response.data, null, 2));
      console.error('[API Error Headers]:', error.response.headers);
      
    } else if (error.request) {
      // Scenario B: The request was dispatched but no receipt acknowledgment was returned
      if (error.code === 'ERR_CANCELED' || error.name === 'AbortError') {
        console.error('[Network Error] Connection terminated: Request timed out.');
      } else {
        console.error('[Network Error] Request dispatched but no response captured:', error.message);
      }
    } else {
      // Scenario C: Something triggered an anomaly while constructing the request configurations
      console.error('[Axios Setup Error] Issue during payload/config assembly:', error.message);
    }
  }
  
  /**
   * Captures non-network exceptions like local ReferenceErrors or Null pointers
   */
  function handleNativeError(error) {
    console.error('[Runtime Error] Critical non-network system error occurred:', error.message);
  }

async function transformNiftyIndicesArrayToResponsiveCards(niftyIndices){

    try {

        
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
    catch(erre){
        console.log('Nifty indices array conversion to cards failed ');
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
                 

                sendRobustPostRequest(targetUrl, indicesData)
                .then(data => console.log('Parsed Server Yield:', data))
                .catch(() => console.log('Transaction halted. Local safeguards executed successfully.'));







             }
        }
        else {
            console.log("store is not available at the server STORE2 package failed .... ")
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


async function transformJsonToResponsiveCards(indicesArray) {


   
    // If the array is empty or blocked, the existing fallback arrays take over
    if (!indicesArray || indicesArray === null || !Array.isArray(indicesArray)) {
        // Trigger your current fallback mechanics here...

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
    // Inside your transformJsonToResponsiveCards layout mapping iteration:
    // Map through the direct properties returned from the allIndices endpoint
    const cardsMarkup = indicesArray.map(item => {
        // Properties matched directly to the corporate API dictionary keys
       /* const name = item.index || 'N/A';
        const current = item.last ? item.last.toLocaleString('en-IN') : 'N/A';
        const percentChange = item.percentChange !== undefined ? item.percentChange : '0.00';
        const open = item.open ? item.open.toLocaleString('en-IN') : 'N/A';
        const high = item.high ? item.high.toLocaleString('en-IN') : 'N/A';
        const low = item.low ? item.low.toLocaleString('en-IN') : 'N/A';
        const prevClose = item.previousClose ? item.previousClose.toLocaleString('en-IN') : 'N/A';
        
        const isNegative = parseFloat(percentChange) < 0;*/
        // Exact mapping matches to the live NSE allIndices API response properties
        const name = item.index || 'N/A';
        const current = item.last ? item.last.toLocaleString('en-IN') : 'N/A';
        const percentChange = item.percentChange !== undefined ? item.percentChange : '0.00';
        
        const open = item.open ? item.open.toLocaleString('en-IN') : 'N/A';
        const high = item.high ? item.high.toLocaleString('en-IN') : 'N/A';
        const low = item.low ? item.low.toLocaleString('en-IN') : 'N/A';
        const prevClose = item.previousClose ? item.previousClose.toLocaleString('en-IN') : 'N/A';
        
        // Multi-period historical records present in the JSON stream payload
        const oneWeekAgo = item.oneWeekAgoVal ? item.oneWeekAgoVal.toLocaleString('en-IN') : 'N/A';
        const oneMonthAgo = item.oneMonthAgoVal ? item.oneMonthAgoVal.toLocaleString('en-IN') : 'N/A';
        const oneYearAgo = item.oneYearAgoVal ? item.oneYearAgoVal.toLocaleString('en-IN') : 'N/A';
        
        const yearHigh = item.yearHigh ? item.yearHigh.toLocaleString('en-IN') : 'N/A';
        const yearLow = item.yearLow ? item.yearLow.toLocaleString('en-IN') : 'N/A';
        
        const isNegative = parseFloat(percentChange) < 0;

 


        // Reuse the exact Tailwind carousel/card layout built in the previous milestone
        return `
        <div class="snap-center shrink-0 w-[85vw] sm:w-[45vw] md:w-auto bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <h3>${name}</h3>
            <div>${current}</div>
            </div>
        `;
    }).join('');

    return `<!DOCTYPE html>...${cardsMarkup}...</html>`;
}

/**
 * @param {*} rawhtml 
 *  
 * @returns Tailwind compiled HTML
 * Output Example
 * 
 */
async function transformTableToResponsiveCardsCarousel(rawTableHtml) {
    let indicesData = [];
    let isFallbackState = false;

    // 1. CHEERIO PARSING ENGINE
    try {
        if (!rawTableHtml || typeof rawTableHtml !== 'string' || rawTableHtml.trim() === "") {
            throw new Error("Empty HTML fragment input.");
        }

        const $ = cheerio.load(rawTableHtml);
        const rows = $('tr');

        rows.each((index, element) => {
            const row = $(element);
            const nameAnchor = row.find('td[headers*="indexCol"] a');
            
            if (nameAnchor.length > 0) {
                const indexName = nameAnchor.text().trim();
                
                const current = row.find('td:nth-child(2)').text().trim() || 'N/A';
                const percentChange = row.find('td:nth-child(3)').text().trim() || '0.00';
                const open = row.find('td:nth-child(4)').text().trim() || 'N/A';
                const high = row.find('td:nth-child(5)').text().trim() || 'N/A';
                const low = row.find('td:nth-child(6)').text().trim() || 'N/A';
                const indicativeClose = row.find('td:nth-child(7)').text().trim();
                const prevClose = row.find('td:nth-child(8)').text().trim() || 'N/A';
                const oneWeekAgo = row.find('td:nth-child(10)').text().trim() || 'N/A';
                const oneMonthAgo = row.find('td:nth-child(11)').text().trim() || 'N/A';
                const oneYearAgo = row.find('td:nth-child(12)').text().trim() || 'N/A';
                const yearHigh = row.find('td:nth-child(13)').text().trim() || 'N/A';
                const yearLow = row.find('td:nth-child(14)').text().trim() || 'N/A';

                const isNegative = row.find('td:nth-child(3)').hasClass('redTxt') || parseFloat(percentChange) < 0;

                indicesData.push({
                    name: indexName, current, percentChange, open, high, low,
                    indicativeClose: indicativeClose === '-' ? 'N/A' : indicativeClose,
                    prevClose, oneWeekAgo, oneMonthAgo, oneYearAgo, yearHigh, yearLow, isNegative
                });
            }
        });

        if (indicesData.length === 0) throw new Error("Zero matches extracted.");

    } catch (error) {
        isFallbackState = true;
        const fallbackSymbols = ["NIFTY 50", "NIFTY NEXT 50", "NIFTY BANK", "NIFTY FINANCIAL SERVICES", "NIFTY MIDCAP SELECT"];
        indicesData = fallbackSymbols.map(symbol => ({
            name: symbol, current: 'N/A', percentChange: '0.00', open: 'N/A', high: 'N/A', low: 'N/A',
            prevClose: 'N/A', oneWeekAgo: 'N/A', oneMonthAgo: 'N/A', oneYearAgo: 'N/A', yearHigh: 'N/A', yearLow: 'N/A',
            isNegative: false
        }));
    }

    // 2. MARKUP CARDS COMPILER (WITH SCROLL SNAP INJECTION)
    const cardsMarkup = indicesData.map(item => {
        const isNeutral = item.current === 'N/A';
        const trendColor = isNeutral ? 'text-slate-400' : (item.isNegative ? 'text-red-500' : 'text-emerald-500');
        const trendBg = isNeutral ? 'bg-slate-100' : (item.isNegative ? 'bg-red-50/50' : 'bg-emerald-50/50');
        const trendBorder = isNeutral ? 'border-slate-200' : (item.isNegative ? 'border-red-100' : 'border-emerald-100');
        const trendIcon = isNeutral ? '•' : (item.isNegative ? '▼' : '▲');

        return `
        <div class="snap-center shrink-0 w-[85vw] sm:w-[45vw] md:w-auto bg-white border ${trendBorder} rounded-2xl shadow-sm p-5 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-xs font-bold text-slate-800 tracking-tight uppercase max-w-[65%] truncate">${item.name}</h3>
                    <span class="flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${trendBg} ${trendColor}">
                        <span class="mr-1 text-[9px]">${trendIcon}</span> ${item.percentChange}%
                    </span>
                </div>
                <div class="text-xl font-black tracking-tight text-slate-900 mb-4 ${isNeutral ? 'opacity-40' : ''}">
                    ${item.current}
                </div>
            </div>

            <div class="space-y-3 border-t border-slate-100 pt-3">
                <div class="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                    <div class="bg-slate-50 p-1.5 rounded-lg">
                        <span class="block text-[9px] uppercase font-semibold text-slate-400">Open</span>
                        <span class="font-bold text-slate-700">${item.open}</span>
                    </div>
                    <div class="bg-slate-50 p-1.5 rounded-lg">
                        <span class="block text-[9px] uppercase font-semibold text-slate-400">High</span>
                        <span class="font-bold ${isNeutral ? 'text-slate-700' : 'text-emerald-600'}">${item.high}</span>
                    </div>
                    <div class="bg-slate-50 p-1.5 rounded-lg">
                        <span class="block text-[9px] uppercase font-semibold text-slate-400">Low</span>
                        <span class="font-bold ${isNeutral ? 'text-slate-700' : 'text-red-600'}">${item.low}</span>
                    </div>
                </div>

                <div class="text-[11px] space-y-1 text-slate-600">
                    <div class="flex justify-between pb-0.5 border-b border-dashed border-slate-100">
                        <span class="text-slate-400">Prev. Close</span>
                        <span class="font-semibold text-slate-700">${item.prevClose}</span>
                    </div>
                    <div class="flex justify-between pb-0.5 border-b border-dashed border-slate-100">
                        <span class="text-slate-400">1W Ago</span>
                        <span class="font-semibold text-slate-700">${item.oneWeekAgo}</span>
                    </div>
                    <div class="flex justify-between pb-0.5 border-b border-dashed border-slate-100">
                        <span class="text-slate-400">1M Ago</span>
                        <span class="font-semibold text-slate-700">${item.oneMonthAgo}</span>
                    </div>
                    <div class="flex justify-between pb-0.5 border-b border-dashed border-slate-100">
                        <span class="text-slate-400">1Y Ago</span>
                        <span class="font-semibold text-slate-700">${item.oneYearAgo}</span>
                    </div>
                    <div class="flex justify-between pt-0.5">
                        <span class="text-slate-400">52W H / L</span>
                        <span class="font-bold text-slate-700 text-[10px]">
                            <span class="${isNeutral ? 'text-slate-700' : 'text-emerald-600'}">${item.yearHigh}</span> / 
                            <span class="${isNeutral ? 'text-slate-700' : 'text-red-500'}">${item.yearLow}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    const recoveryButtonMarkup = isFallbackState ? `
    <div class="mt-6 flex flex-col items-center justify-center">
        <button onclick="window.location.reload();" class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md cursor-pointer transition-transform active:scale-95">
            FORCE REFRESH STREAM
        </button>
    </div>` : '';

    const statusBadge = isFallbackState ? `
    <div class="flex items-center space-x-1 bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
        <span class="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
        <span>Playground</span>
    </div>` : `
    <div class="flex items-center space-x-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
        <span class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Live</span>
    </div>`;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Indices Matrix Slider</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-font-smoothing: antialiased; }
            
            /* Hide viewport layout native bars to preserve application immersion */
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        </style>
    </head>
    <body class="bg-slate-50 p-3 min-h-screen flex items-center justify-center">

        <div class="w-full max-w-7xl mx-auto overflow-hidden">
            <div class="flex items-center justify-between mb-4 px-1">
                <div>
                    <h2 class="text-base font-extrabold text-slate-900 tracking-tight">Market Indices</h2>
                    <p class="text-[10px] text-slate-400 font-medium">Swipe to explore indexes</p>
                </div>
                ${statusBadge}
            </div>

            <div class="flex md:grid overflow-x-auto md:overflow-x-visible snap-x snap-mandatory no-scrollbar gap-4 pb-4 md:pb-0 px-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                ${cardsMarkup}
            </div>

            ${recoveryButtonMarkup}
        </div>

    </body>
    </html>
    `;
}

router.post("/stockbrowser-allindicesfromlocal/send",   (req, res) => {


    try {
    const tailwindIndicesHTML  = _.pick(req.body, ["liveindicestailwindhtml"   ])
    const allNiftyIndices = _.pick(req.body, ["jsonPayLoad"   ])
    //transformTableToResponsiveCards
    /**
     const store  = require( "store2");
       store.set('isDelivered', isDelivered);

     */
     // 1. Get the requested URL Hostname (e.g., 'localhost', '127.0.0.1', or 'example.com')
     const requestedHost = req.hostname;
     let isLocal = false;
     // 2. Get the Client's Connecting IP Address
     const clientIp = req.ip;

     // Target values you want to validate against
     const TARGET_IP = process.env.INDICES_SERVER_LOCAL_IP; 

     // Check if the requested host is localhost
     const isLocalhostRequest = (requestedHost === 'localhost' || requestedHost === '127.0.0.1' || requestedHost === '::1');

     // Check if the client matching a specific target IP
     // Note: Node often reads IPv4 as IPv6-mapped strings like '::ffff:192.168.1.50'
     const isTargetIp = (clientIp === TARGET_IP || clientIp === `::ffff:${TARGET_IP}`);

     // Business logic based on your validation
     if (isLocalhostRequest && isTargetIp) {
         isLocal = true;
     }
     if (!isLocal){ 
        if(store !==undefined && store !==null){
            if(allNiftyIndices !== undefined && allNiftyIndices !==null ){

                store.set("indicesData", allNiftyIndices);
                console.log("SERVER with NIFTY INDICES  UPDATED "+new Date().toLocaleDateString())
                console.log(` ${JSON.stringify(allNiftyIndices)}`)
            }
            else {
                let oldIndicies = store.get('indicesData');
                if(oldIndicies!==null && oldIndicies !== undefined){
                    console.log("SERVER with NIFTY INDICES not UPDATED ")
                    console.log(` ${JSON.stringify(oldIndicies)}`)

                }

            }

        }
     }
    if(tailwindIndicesHTML !== undefined && tailwindIndicesHTML !==null){
        // check is a valid HTML 

          // 1. CHEERIO PARSING ENGINE
    try {
        if (  typeof tailwindIndicesHTML !== 'string' || tailwindIndicesHTML.trim() === "") {
            throw new Error("Empty HTML fragment input.");
        }
        const $ = cheerio.load(tailwindIndicesHTML);

      
      } catch(err)  {
            res.send(err)
        }
        const $ = cheerio.load(rawTableHtml);
         
    }




     } catch(err1)  {
    res.send(err1)
}
    
})
router.get('/stockbrowser/:symbol', async (req, res) => {
    console.log(`🚀 INVOKED  /stockbrowser/:symbol : ${req.params.symbol}`);
    console.log(`🚀 INVOKING WORKER RACE FOR: ${req.params.symbol}`);

    try {
        const { symbol } = req.params;

        // 1. Call the worker manager instead of fetchQuote directly
        // check synvols is nifty indices 
        let isNifty = req.params.symbol.toLocaleUpperCase().indexOf('NIFTY') > -1 ? true : false;
        
    
        
       let  pupQuote =  {}
       let  formattedQuote =  {}
       if(isNifty){
        console.log(`🚀 FETCHING NIFTY SCRIPT  : ${req.params.symbol}`);
          // pupQuote = await getQuoteWithWorkers(symbol.toUpperCase());
           pupQuote = await fetchNiftyQuoteold(symbol.toUpperCase(),  3);

       // 2. Format the data to match your frontend's expectations
       // Note: We use .replace(/,/g, '') to convert string "1,467.20" to a number format
        formattedQuote = {
           companyName: pupQuote.companyName !== undefined ? pupQuote.companyName  :  "",
           symbol: pupQuote.symbol !== undefined ? pupQuote.symbol  :  "",
           sector: '',
           latestPrice: parseFloat(pupQuote.latestPrice?.replace(/,/g, '')),
           open: pupQuote.details?.Open || '0',
           high: pupQuote.details?.High || '0',
           low: pupQuote.details?.Low || '0',
           close: pupQuote.details?.["Close *"] || '0', // NSE uses "Close *"
           week52High: pupQuote.details?.["52W H"] || '',
           week52Low: pupQuote.details?.["52W L"] || '',
       };

       }
        else {
            pupQuote = await getQuoteWithWorkers(symbol.toUpperCase());

            // 2. Format the data to match your frontend's expectations
            // Note: We use .replace(/,/g, '') to convert string "1,467.20" to a number format
             formattedQuote = {
                companyName: pupQuote.companyName !== undefined ? pupQuote.companyName  :  "",
                symbol: pupQuote.symbol !== undefined ? pupQuote.symbol  :  "",
                sector: '',
                latestPrice: parseFloat(pupQuote.latestPrice?.replace(/,/g, '')),
                open: pupQuote.details?.Open || '0',
                high: pupQuote.details?.High || '0',
                low: pupQuote.details?.Low || '0',
                close: pupQuote.details?.["Close *"] || '0', // NSE uses "Close *"
                week52High: pupQuote.details?.["52W H"] || '',
                week52Low: pupQuote.details?.["52W L"] || '',
            };
        }
          

        console.log(`✅ Success: ${formattedQuote.symbol} at ${formattedQuote.latestPrice}`);
        res.json(formattedQuote);

    } catch (err) {
        console.error(`❌ Route Error: ${err.message}`);
        res.status(500).json({
            error: "Market Data Unavailable",
            message: "The workers were unable to parse NSE data. Please try again in a moment."
        });
    }
});



router.get('/stockbrowserold2/:symbol', async (req, res) => {
    console.log(` TRYING PUPPETEER APPROACH `, );        

    try {  
        const { symbol } = req.params;

       let pupQuote = await  fetchQuote(symbol.toUpperCase(),  3);
       /**
           return {
        symbol: symbolText,
        latestPrice,
        companyName,
        details
        };

        Output Example
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

       const formattedQuote    = {
        companyName: pupQuote.companyName,
        symbol: pupQuote.symbol,
        sector:  '',
        latestPrice: pupQuote.latestPrice,  
        open: pupQuote.details.Open,
        high: pupQuote.details.High,
        low: pupQuote.details.Low,
        close: pupQuote.details.Close,
        week52High: '',
        week52Low: '',
    };
        console.log(`formattedQuote quote from puppeteer  ${JSON.stringify(formattedQuote)}`);
        res.json(formattedQuote);

    }       
    catch(ert){
        res.status(ert.response?.status || 500).json({ 
            error: "Market Data Unavailable",
            message: `Ensure your puppeteer is parsing the nseindia with right selectore is valid.`
        });
    }   
});


router.get('/stockbrowserold/marketstatus', async (req, res) => {
 
    console.log(` REQUEST at /stockbrowserold/marketstatus`, );        
    console.log(` TRYING PUPPETEER APPROACH `, );        

    try {  
       // const { symbol } = req.params;

       let niftyIndices = await fetchNiftyIndicesTPlayWright(3);  /// await  fetchNiftyIndicesThird(   3);

        // 2. Transmute data layers out of standard tables into rich modular UI template
        //const responsiveDashboardHtml = await transformTableToResponsiveCardsCarousel(niftyIndices);
        // 1. Get the requested URL Hostname (e.g., 'localhost', '127.0.0.1', or 'example.com')
        const requestedHost = req.hostname;
        let isLocal = false;
        // 2. Get the Client's Connecting IP Address
        const clientIp = req.ip;

        // Target values you want to validate against
        const TARGET_IP = process.env.INDICES_SERVER_LOCAL_IP; 

        // Check if the requested host is localhost
        const isLocalhostRequest = (requestedHost === 'localhost' || requestedHost === '127.0.0.1' || requestedHost === '::1');

        // Check if the client matching a specific target IP
        // Note: Node often reads IPv4 as IPv6-mapped strings like '::ffff:192.168.1.50'
        const isTargetIp = (clientIp === TARGET_IP || clientIp === `::ffff:${TARGET_IP}`);
        let  responsiveDashboardHtml = ""
        // Business logic based on your validation
        if (isLocalhostRequest && isTargetIp) {
            isLocal = true; 
             responsiveDashboardHtml = await transformTableToResponsiveCardsWithPoll (niftyIndices, isLocal);
        }
        else {
            // check the nifty indices updated from LOCAL SERVER POST 
            if(store !==null && store!==undefined){
                let localNiftyIndices = store.get('indicesData');
                if(localNiftyIndices !==null && localNiftyIndices!==undefined && Array.isArray(localNiftyIndices) &&localNiftyIndices.length > 0 ){

                    responsiveDashboardHtml = await transformNiftyIndicesArrayToResponsiveCards(localNiftyIndices)
                }
                else {
                    console.log(`  SERVER store DID NOT RECEIVE NIFTY INDICES FROM LOCAL SERVER   `, );     
                }
            }
            else {
                console.log(`  SERVER store not defined  `, );        
            }
        }

        
        
        



       globalStore.tableLiveIndices =
       responsiveDashboardHtml;

       globalStore.lastUpdated =
       new Date();

       /**
           return {
        symbol: symbolText,
        latestPrice,
        companyName,
        details
        };

        Output Example
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

       const marketStatusIndices    =  responsiveDashboardHtml;
        //console.log(`marketStatusIndices  quote from puppeteer  ${JSON.stringify(marketStatusIndices)}`);
        console.log(` table live indices HTML   `);
        console.log(marketStatusIndices);
     
       // 3. Set content type to HTML text structure and emit payload explicitly 
       res.setHeader('Content-Type', 'text/html');
       return res.status(200).send(responsiveDashboardHtml);
      //  return res.status(200).send(marketStatusIndices);
       // res.send(marketStatusIndices);
      //  res.json(marketStatusIndices);

    }       
    catch(ert){

        if (
            globalStore.marketStatus &&
            globalStore.marketStatus.length > 0
          ) {
    
            return res.json( 
                globalStore.marketStatus
            );
    
          }
        else if( globalStore.tableLiveIndices !==undefined){
            return res.send( 
                globalStore.tableLiveIndices
            );
    
        }
        else { 

        res.status(ert.response?.status || 500).json({ 
            error: "Market Status Data Unavailable",
            message: `Ensure your puppeteer is parsing the nseindia with right selectore is valid.`
        });

        }


       
    }   
});

router.get('/stockbrowserold/:symbol', async (req, res) => {

    console.log(`🚀 INVOKED  /stockbrowserold/:symbol : ${req.params.symbol}`);
    console.log(` TRYING PUPPETEER APPROACH fetchQuoteold `, );        

    try {  
        const { symbol } = req.params;


         // check synvols is nifty indices 
         let isNifty = req.params.symbol.toLocaleUpperCase().indexOf('NIFTY') > -1 ? true : false;
        
         let  pupQuote =  {}
         let  formattedQuote =  {}
         if(isNifty){
            console.log(`🚀 stockbrowserold FETCHING NIFTY SCRIPT  : ${req.params.symbol}`);
            // pupQuote = await getQuoteWithWorkers(symbol.toUpperCase());
             pupQuote = await fetchNiftyQuoteold(symbol.toUpperCase(),  3);
 
         // 2. Format the data to match your frontend's expectations
         // Note: We use .replace(/,/g, '') to convert string "1,467.20" to a number format
          formattedQuote = {
             companyName: pupQuote.companyName !== undefined ? pupQuote.companyName  :  "",
             symbol: pupQuote.symbol !== undefined ? pupQuote.symbol  :  "",
             sector: '',
             latestPrice: parseFloat(pupQuote.latestPrice?.replace(/,/g, '')),
             open: pupQuote.details?.Open || '0',
             high: pupQuote.details?.High || '0',
             low: pupQuote.details?.Low || '0',
             close: pupQuote.details?.["Close *"] || '0', // NSE uses "Close *"
             week52High: pupQuote.details?.["52W H"] || '',
             week52Low: pupQuote.details?.["52W L"] || '',
         };
 
         }
         else {
           //  pupQuote = await getQuoteWithWorkers(symbol.toUpperCase());
              pupQuote = await  fetchQuoteold(symbol.toUpperCase(),  3);
             // 2. Format the data to match your frontend's expectations
             // Note: We use .replace(/,/g, '') to convert string "1,467.20" to a number format
              formattedQuote = {
                 companyName: pupQuote.companyName !== undefined ? pupQuote.companyName  :  "",
                 symbol: pupQuote.symbol !== undefined ? pupQuote.symbol  :  "",
                 sector: '',
                 latestPrice: parseFloat(pupQuote.latestPrice?.replace(/,/g, '')),
                 open: pupQuote.details?.Open || '0',
                 high: pupQuote.details?.High || '0',
                 low: pupQuote.details?.Low || '0',
                 close: pupQuote.details?.["Close *"] || '0', // NSE uses "Close *"
                 week52High: pupQuote.details?.["52W H"] || '',
                 week52Low: pupQuote.details?.["52W L"] || '',
             };
         }




      
       /**
           return {
        symbol: symbolText,
        latestPrice,
        companyName,
        details
        };

        Output Example
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
         /* 
        formattedQuote    = {
        companyName: pupQuote.companyName,
        symbol: pupQuote.symbol,
        sector:  '',
        latestPrice: pupQuote.latestPrice,  
        open: pupQuote.details.Open,
        high: pupQuote.details.High,
        low: pupQuote.details.Low,
        close: pupQuote.details.Close,
        week52High: '',
        week52Low: '',
    }; */
        console.log(`formattedQuote quote from puppeteer  ${JSON.stringify(formattedQuote)}`);
        res.json(formattedQuote);

    }       
    catch(ert){
        res.status(ert.response?.status || 500).json({ 
            error: "Market Data Unavailable",
            message: `Ensure your puppeteer is parsing the nseindia with right selectore is valid.`
        });
    }   
});


/**
 * @route   GET /api/market-dashboard
 * @desc    Serves up compiled, ultra-fast, mobile responsive index carousel cards
 * @access  Public (Used natively by your frontend Iframe micro-wrapper)
 */
router.get('/stockbrowser-allindices/market-dashboard', async (req, res) => {
    console.log(`\n📥 [${new Date().toISOString()}] Incoming request at /api/stockbrowser-allindices/market-dashboard`);
    
    // Set response header to HTML immediately so the Iframe knows how to render the output stream
    res.setHeader('Content-Type', 'text/html');

    try {
        // 1. Fire the lightweight session cookie handshake and JSON extraction loop
        const rawJsonData = await fetchNiftyIndicesDirectAPI();

        // 2. Filter down the massive 70+ index array to the specific target metrics
        // This ensures your mobile carousel is neat and doesn't load unneeded indexes
        const targetIndices = ["NIFTY 50", "NIFTY NEXT 50", "NIFTY BANK", "NIFTY FINANCIAL SERVICES", "NIFTY MIDCAP SELECT"];
        
        let filteredData = [];
        if (Array.isArray(rawJsonData)) {
            filteredData = rawJsonData.filter(item => 
                item && item.index && targetIndices.includes(item.index.toUpperCase().trim())
            );
        }

        // If the filtering left us with an empty array due to an upstream schema alteration, trigger the fallback pipeline
        if (filteredData.length === 0) {
            console.warn("⚠️ API structure matched but zero target indices cleared the filter array.");
            // Passing null ensures the transformation engine safely serves up the empty playground cards
            const fallbackHtml = transformJsonToResponsiveCards(null);
            return res.status(200).send(fallbackHtml);
        }

        // 3. Compile the clean corporate data layer directly into your Tailwind scroll-snap view
        console.log(`⚡ Generating responsive card UI layouts for ${filteredData.length} valid indices...`);
        const fullyCompiledHtml = transformJsonToResponsiveCards(filteredData);
        
        // Return 200 OK with the standalone functional document structure
        return res.status(200).send(fullyCompiledHtml);

    } catch (routeError) {
        // GLOBAL EXCEPTION CATCHING BLOCK
        console.error("🚨 Route Exception Caught during runtime execution:", routeError.message);
        
        // Instead of breaking the pipeline or sending a broken 502/500 text chunk to the client,
        // we feed null into the converter, generating the elegant "Offline Playground Mode" view layout.
        try {
            const proactiveRecoveryHtml = transformJsonToResponsiveCards(null);
            return res.status(200).send(proactiveRecoveryHtml);
        } catch (renderingSystemError) {
            // Ultimate fallback safety baseline in case the template literal compilation itself breaks
            console.error("Critical Failure inside template rendering compilation block:", renderingSystemError.message);
            return res.status(500).send(`
                <div style="font-family:sans-serif; padding:30px; text-align:center; color:#64748b; background:#f8fafc;">
                    <h3 style="color:#f43f5e;">System Link Interrupted</h3>
                    <p style="font-size:13px;">Critical rendering framework timeout. Please try again later.</p>
                    <button onclick="window.location.reload();" style="background:#4f46e5; color:white; border:0; padding:10px 20px; border-radius:20px; font-weight:bold; font-size:12px; cursor:pointer; margin-top:10px;">Re-initialize Connection</button>
                </div>
            `);
        }
    }
});

// GET /api/stock/:symbol
router.get('/stock/:symbol', async (req, res) => {
    /*try {
        const { symbol } = req.params;
        // Call IEX from the backend to bypass CORS
        const response = await axios.get(`https://api.iextrading.com/1.0/stock/${symbol}/batch?types=quote`, {
            timeout: 5000 // Prevent hanging
        });

        res.json(response.data);
    } catch (error) {
        console.error("IEX Fetch Error:", error.message);
        // Return a 500 instead of crashing the backend
        res.status(500).json({ 
            error: "Market Data Unavailable", 
            details: error.response?.data || error.message 
        });
    }*/
        console.log(`🚀 INVOKED  /stock/:symbol : ${req.params.symbol}`);
        try {
            const { symbol } = req.params;
            const TOKEN = process.env.IEX_TOKEN; // Get this from iexcloud.io
    
            // Updated URL to version 'stable' or 'v1'
           // const url = `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=${TOKEN}`;

               // 1. Fetch the data from your new Render API https://artilleryfeed2.onrender.com
            // Note: Using the equity endpoint as you provided
            const response = await axios.get(`${URLS.AP1}/api/equity/${symbol.toUpperCase()}`);
            const resData = response.data;
            
           // const response = await  placeMockOrder(req , res);  // axios.get(url);
            res.json(response.data);
        } catch (error) {
            console.log(`${URLS.AP1}/ Fetch Error:`, error.response?.status);

            console.log(` TRYING PUPPETEER APPROACH `, );       
            
            try {
                const { symbol } = req.params;
        
                // 1. Call the worker manager instead of fetchQuote directly
                const pupQuote = await getQuoteWithWorkers(symbol.toUpperCase());
        
                // 2. Format the data to match your frontend's expectations
                // Note: We use .replace(/,/g, '') to convert string "1,467.20" to a number format
                const formattedQuote = {
                    companyName: pupQuote.companyName,
                    symbol: pupQuote.symbol,
                    sector: '',
                    latestPrice: parseFloat(pupQuote.latestPrice.replace(/,/g, '')),
                    open: pupQuote.details?.Open || '0',
                    high: pupQuote.details?.High || '0',
                    low: pupQuote.details?.Low || '0',
                    close: pupQuote.details?.["Close *"] || '0', // NSE uses "Close *"
                    week52High: pupQuote.details?.["52W H"] || '',
                    week52Low: pupQuote.details?.["52W L"] || '',
                };
        
                console.log(`✅ Success: ${formattedQuote.symbol} at ${formattedQuote.latestPrice}`);
                res.json(formattedQuote);
        
            } catch (err) {
                console.error(`❌ Route Error: ${err.message}`);
                res.status(500).json({
                    error: "Market Data Unavailable",
                    message: "The workers were unable to parse NSE data. Please try again in a moment."
                });
            }
              /**
                   return {
                symbol: symbolText,
                latestPrice,
                companyName,
                details
                };

                Output Example
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
               /*
            try {  
               let pupQuote = await  fetchQuote(symbol.toUpperCase(),  3);
            

               const formattedQuote    = {
                companyName: pupQuote.companyName,
                symbol: pupQuote.symbol,
                sector:  '',
                latestPrice: pupQuote.latestPrice,  
                open: pupQuote.details.Open,
                high: pupQuote.details.High,
                low: pupQuote.details.Low,
                close: pupQuote.details.Close,
                week52High: '',
                week52Low: '',
            };
                console.log(`formattedQuote quote from puppeteer  ${JSON.stringify(formattedQuote)}`);
                res.json(formattedQuote);

            }       
            catch(ert){
                res.status(error.response?.status || 500).json({ 
                    error: "Market Data Unavailable",
                    message: `Ensure your ${URLS.AP1}/ or puppeteer is parsing the nseindia with right selectore is valid.`
                });
            }   
            */

           
        }
});
router.get('/chart/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        // Indian stocks need .NS suffix for Yahoo Finance (e.g., ICICIBANK.NS)
        const ticker = symbol.includes('.') ? symbol : `${symbol}.NS`;
        
        // Yahoo API for Intraday (Range: 1 day, Interval: 5 mins)
        const yahooUrl = `${URLS.AP2}/v8/finance/chart/${ticker}?range=1d&interval=5m`;

        const response = await axios.get(yahooUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' } // Yahoo requires a User-Agent header
        });
        console.log(" yahoo finance chart :: "+ticker+" "+JSON.stringify(response.data))
        const result = response.data.chart.result[0];
        
        if (!result) {
            return res.status(404).json({ error: "No chart data found for this symbol." });
        }

        const timestamps = result.timestamp;
        const prices = result.indicators.quote[0].close;

        // Map timestamps and prices into your StockData interface
        const formattedData = timestamps.map((ts, index) => ({
            // Convert UNIX timestamp to readable Time (HH:mm)
            date: new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: prices[index] ? parseFloat(prices[index].toFixed(2)) : null
        })).filter(item => item.price !== null); // Clean out nulls
        console.log(" Yahoo formatted Data ::   "+JSON.stringify(formattedData))
        res.json(formattedData);

    } catch (error) {
        console.error("Yahoo Chart Error:", error.message);
        
        // Detailed Exception Handling
        const statusCode = error.response?.status || 500;
        const errorMessage = statusCode === 404 
            ? "Stock Symbol not found on Yahoo Finance." 
            : "Failed to reach Yahoo Market Data.";

        res.status(statusCode).json({ error: errorMessage });
    }
});
//const TradeOrder = require('./models/TradeOrder'); // Path to your schema

/**
 * Mock Order Placement for Sprint Testing
 * POST /api/v3/orders/sync-mock
 */
const placeMockOrder = async (req, res) => {
    try {
        const { symbol, qty, side, productType, limitPrice, orderTag, userId } = req.body;

        // 1. Basic Validation (Mirroring Fyers Requirements)
        if (!symbol || !qty || !side || !userId) {
            return res.status(400).json({
                s: "error",
                code: -1,
                message: "Missing mandatory fields (symbol, qty, side, or userId)"
            });
        }

        // 2. Mock Order Reference Generation
        // Fyers IDs are typically numeric strings around 11-12 digits
        const mockOrderRef = `52${Math.floor(100000000 + Math.random() * 900000000)}`;

        // 3. Record in MongoDB
        const newOrder = new TradeOrder({
            userId,
            orderRef: mockOrderRef,
            symbol,
            qty,
            side,
            productType,
            limitPrice,
            orderTag: orderTag || "mock_tag"
        });

        await newOrder.save();

        // 4. Update Portfolio/Money Logic (Optional Placeholder)
        // Here you would deduct balance from wall-street/money if (side === 1)

        // 5. Success Response (Exact Fyers Format)
        return res.status(200).json({
            s: 'ok',
            code: 1101,
            message: `Order submitted successfully. Your Order Ref. No.${mockOrderRef}`,
            id: mockOrderRef
        });

    } catch (error) {
        console.error("❌ Mock Placement Error:", error);
        
        // Handle MongoDB Duplicate Key or Server Crashes
        return res.status(500).json({
            s: 'error',
            code: -99,
            message: "Internal Server Error or Database Constraint Violated",
            details: error.message
        });
    }
};

module.exports = router;
