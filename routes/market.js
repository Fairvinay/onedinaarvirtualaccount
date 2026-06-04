const express = require('express');
const axios = require('axios');
const router = express.Router();
const TradeOrder = require('../models/tradeorder'); // Path to your schema
//const fetchQuote = require('./fetchQuote'); // Path to your puppeteer fetch 
//const fetchQuoteold = require('./fetchQuote'); // Path to your puppeteer fetch 
   const { fetchQuote , fetchQuoteold , fetchNiftyQuoteold }  = require('./fetchQuote');
   const { getQuoteWithWorkers } = require('../middleware/quoteService');
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
