const { workerData, parentPort } = require('worker_threads');
const {
    Worker, isMainThread,  
  } = require('node:worker_threads');

require("dotenv").config();

const axios =require("axios");
const https = require('https');
const csv =require("csv-parser");
const fs =require("fs");
const outputFile = './nifty50worker_data.txt';
/*const writeStream = fs.createWriteStream(outputFile, {
    flags: 'a',
  });
*/
const writeStream = undefined;
const mongoose =require("mongoose");
const Nifty50Stock =require("./models/Nifty50Stock");

const workerName = workerData.name;
const FYERS_EQUITY_CSV = "https://public.fyers.in/sym_details/NSE_CM.csv";
const FYERS_VALIDATE_URL = `${process.env.FYERS_BASE_URL}/profile`;
const FYERS_GETHISTORY_URL = `${process.env.FYERS_HISTORY_URL}`;

let i = 0;
let MAXWORKERTRIES = 1; 
// ----------------------------------
// Mongo Connection
// ----------------------------------
async function connectMongo(){
    const url = `mongodb+srv://fairvinay:${process.env.PASSWORD}@cluster0.9ke4d.mongodb.net/wall-street?retryWrites=true&w=majority`


 await mongoose.connect(    url)  .then(() => {
     
    console.log("✅ Connected from Fyers Histroy Worker MongoDB Atlas successfully");
    //if(writeStream !==undefined && writeStream !==null){ 
        console.log(` [worker_write]${workerName} ${Date.now()}  Connected MongoDB for Nifty50 stocks update \r\n `);
   //    }
})
.catch((err) => {
    console.error("❌ Fyers Histroy Worker   Database connection error:", err);
}); 
 console.log(    "Mongo Connected" );
}
// ----------------------------------
// Download CSV
// ----------------------------------
async function fetchCSV(){

 const url = FYERS_EQUITY_CSV;
 const response = await axios.get(    url,    {      responseType:"stream"    } );
// if(writeStream !==undefined && writeStream !==null){ 
    console.log(` [worker_write]${workerName} ${Date.now()}  Fetch FYERS NSE_CM.csv  \r\n `);
 //  }

 return response.data;

}


async function validateToken(){
    try {  
        console.log("validateToken with token ");
        console.log(runtimeToken)  ; // Authorization:'Bearer '+runtimeToken 
        let appId = process.env.FYERS_CLIENT_ID;
 const response = await axios.get( `${process.env.FYERS_BASE_URL}/api/v3/profile`, { headers:{   Authorization:`${appId}:${runtimeToken}` } } );
 console.log("validateToken response.data " +JSON.stringify(response.data))
 if( response.data.s==="error" ) {  
   // if(writeStream !==undefined && writeStream !==null){ 
        console.log(` [worker_write]${workerName} ${Date.now()}  FYERS VALIDATE TOKEN FAILED     \r\n `);
   //    }
    
    throw new Error(    "FYERS_TOKEN_EXPIRED"   );
 }
// if(writeStream !==undefined && writeStream !==null){ 
    console.log(` [worker_write]${workerName} ${Date.now()}  FYERS ACCESS TOKEN VALID    \r\n `);
//   }
} catch(ere){
    console.log("validateToken  axios.get  "+`${process.env.FYERS_BASE_URL}/profile` +JSON.stringify(ere))
}
}

let runtimeToken = `${process.env.FYERS_ACCESS_TOKEN}`

function setAccessToken(token){
    runtimeToken = token;
}

// ----------------------------------
// Build Symbol Map
// ----------------------------------

async function buildSymbolMap(){

 const stream =await fetchCSV();
 return new Promise( (resolve,reject)=>{
        let symbolMap = new Map();
        stream .pipe(csv({   headers:false }))
             .on( "data", row=>{
                /*CSV index mapping
                0  Token
                1  Name
                5  ISIN
                13 Symbol
                9  NSE:SOMETHING-EQ
                */
                const eqSymbol = row[9];
                if(       eqSymbol &&       eqSymbol.includes("-EQ")    ){
                const obj = { token:  row[0],  stockName: row[1],  isin: row[5],   symbol:  row[13]      };
                symbolMap.set(        row[5],        obj      );
                }
         })
        .on("end", ()=>{
           console.log(    "Filtered Stocks:",    symbolMap.size   );
         //  if(writeStream !==undefined && writeStream !==null){ 
            console.log(` [worker_write]${workerName} ${Date.now()}  FYERS FILTERED STOCKS    \r\n `);
        //   }
           resolve(symbolMap);
        })
        .on( "error", reject );
 });
}

// ----------------------------------
// Six month range
// ----------------------------------
function getRange(){
 const today = new Date();
 const from = new Date();
 from.setMonth(  today.getMonth()-6 );
 return { range_from: Math.floor( from.getTime()/1000 ),
         range_to: Math.floor(    today.getTime()/1000 )
 };

}

// ----------------------------------
// Fetch Candle History
// ----------------------------------
async function getHistory(symbol)
{
    const range = getRange(); //`NSE:${symbol}-EQ`
    // Create an agent that ignores certificate validation
const httpsAgent = new https.Agent({  
    rejectUnauthorized: false
  });

    const payload = { symbol:symbol, resolution:"D", date_format:"0", range_from: String(range.range_from), range_to: String(range.range_to), cont_flag:"1" };
    try {
        const response = await axios.get( `${process.env.FYERS_HISTORY_URL}`, {
              // Pass the custom HTTPS agent
               httpsAgent: httpsAgent,
                headers:{Authorization: 'Bearer '+runtimeToken }, params:payload});
        const data =  response.data;
        /* FYERS normally returns   {  s:"error",  code:-16,  message:"Token expired" }  */
        if( data.s === "error"  ||  data.code === -16   ||  data.code === 401 )   {
            throw new Error(              "FYERS_TOKEN_EXPIRED"            );
        }
      //  if(writeStream !==undefined && writeStream !==null){ 
            console.log(` [worker_write]${workerName} ${Date.now()}  FYERS HISTORY for  NSE:${symbol}-EQ   \r\n `);
      //     }
        return data;
    }catch(err)
    {        console.error(            "History failed:",            symbol,            err.message        );
       throw err;
    }

}

// ----------------------------------
// Normalize candles
// ----------------------------------

function normalizeCandles( candles=[]){
    return candles.map( c=>{
        let timestamp = Number(c[0]);
         return { time: new Date( timestamp*1000 ) .toISOString() .split("T")[0],
                 open: Number(c[1]),
                 high: Number(c[2]),
                 low: Number(c[3]),
                 close: Number(c[4])
             };
    });
}

// ----------------------------------
// Save Mongo
// ----------------------------------

async function saveStock( stock, candles){
    await Nifty50Stock.updateOne( {  isin:  stock.isin }, {  $set:  {   symbol:   stock.symbol,   stockName:   stock.stockName,  candleData:  candles,
                       updatedAt:   new Date()
                     }
                }, {  upsert:true });
}

async function runNifty50GetHistory() {

            const { url } = workerData;
          parentPort.postMessage({ status: 'started', message: `Launching Nifty 50 GET HISTORY  \n`+ 
                    `EQUITY LIST ===> ${FYERS_EQUITY_CSV} \r\n`+
                ` VALIDATE TOKEN ===>  ${FYERS_VALIDATE_URL} \r\n` +
               `  HISTORY URL ====> ${FYERS_GETHISTORY_URL} `});
         // if(writeStream !==undefined && writeStream !==null){ 
            console.log(` [worker_write]${workerName} ${Date.now()}  `+ `Launching Nifty 50 GET HISTORY  \n`+ 
            `EQUITY LIST ===> ${FYERS_EQUITY_CSV} \r\n`+
        ` VALIDATE TOKEN ===>  ${FYERS_VALIDATE_URL} \r\n` +
       `  HISTORY URL ====> ${FYERS_GETHISTORY_URL} ` );

        //   }
  try {
     while (i < MAXWORKERTRIES ) {  

          await validateToken().then ( async () => {
                     await connectMongo();
                    const stockMap =await buildSymbolMap();
                    /* OLD FOR LOOP no access token expire catch 
                    for( const [  isin,  stock ] of stockMap){
                        console.log( "Processing", stock.symbol);
                        const history =await getHistory( stock.symbol);
                        if( history && history.candles){
                            const candles =normalizeCandles( history.candles);
                            await saveStock( stock, candles);
                            console.log( "Saved", stock.symbol, candles.length);
                        }
                        // prevent API throttling
                        await new Promise( r=>setTimeout(    r,    300 ));
                    }
                    */
                    for( const [  isin,stock] of stockMap)   {
                        console.log(  "Processing:", stock.symbol);
                        let history;
                        try{
                            history =  await getHistory(          stock.symbol       );
                        }
                        catch(err){
                            if( err.message ==="FYERS_TOKEN_EXPIRED" )       {
                                console.error( `========================= FYERS TOKEN EXPIRED STOPPING WORKER  ========================= ` );
                             //   if(writeStream !==undefined && writeStream !==null){ 
                                    console.log(` [worker_write]${workerName} ${Date.now()}  FYERS TOKEN EXPIRED STOPPING WORKER    \r\n `);
                             //   }
                                return {   status:"STOPPED",   reason:"TOKEN_EXPIRED"   };
                            }
                            console.log(  "Skipping stock:",stock.symbol  );   
                            continue;
                        }
                    if( history &&  history.candles )    {
                            const candles =       normalizeCandles(          history.candles       );
                            await saveStock(          stock,          candles       );
                        }
                    await new Promise(    r=>setTimeout(       r,       300    )    );
                        
                    }
                    console.log("Worker Completed");
                 //   if(writeStream !==undefined && writeStream !==null){ 
                        console.log(` [worker_write]${workerName} ${Date.now()}  FYERS HISTORY  COMPLETED   \r\n `);
                 //   }
        
            }).catch((err)=>{
                console.log("Worker EXITED INVALID TOKEN ");
            //    if(writeStream !==undefined && writeStream !==null){ 
                    console.log(` [worker_write]${workerName} ${Date.now()} FYERS TOKEN INVALID HISTORY FETCH EXITED  \r\n `);
            //    }
        
            });
             i= i+1;
              console.log(" Nifty 50 GET HISTORY worker psring "+i+" time nify 50 stocks ")
        
              if (isMainThread) {
               /* for( let k = 0; k < 10; k++) {
                  const workerName = `worker_${k}`;
                  const worker = new Worker(__filename, { workerData: workerName });
                  writeStream.write(`[worker_created]${workerName}\r\n`);
                }*/
              } else {
           //     if(writeStream !==undefined && writeStream !==null){ 
                console.log(`[worker_started]${workerName}     Nifty 50 GET HISTORY worker psring ${i} time nify 50 stocks         \r\n`);
            //    }
              
              }
        
 
      }
  } catch (error) {
       parentPort.postMessage({ status: 'error', error: error.message });
     //  if(writeStream !==undefined && writeStream !==null){ 
         console.log(`[worker_started]${workerName}    ${JSON.stringify( error.message)} \r\n`);
    //   }
     } finally {
     //  if(writeStream !==undefined && writeStream !==null){ 
           console.log(`[worker_write]${workerName} ${Date.now()}   [worker_finished]${workerName} \r\n`);
     //  }
      // await browser.close();
       console.log('closeing the worker ')
       //process.exit(0); // Cleanly exit worker when task finishes
     }

}

runNifty50GetHistory();
