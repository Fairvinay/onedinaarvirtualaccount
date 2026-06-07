const express = require("express")
const bodyParser = require("body-parser")
//const cors = require("cors")
const state = require("./routes/routes")
const users = require("./routes/userRoutes.js")
const market = require("./routes/market.js")
const path = require('path');
const store  = require( "store2");
const { startMarketPoller } =
  require("./marketStatusWorker");
  const { Worker } = require('worker_threads');
const app = express()

// Body Parser Middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));

let allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, x-auth');
    res.header('Access-Control-Expose-Headers', 'x-auth');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    }
    else {
        next();
    }
};

app.use(allowCrossDomain)


// app.use(cors())

app.use("/state", state)
app.use("/users", users)
app.use("/api", market)

app.get("/", (req, res) => {
    res.send("Hey There How are you?")
})
// Start the Playwright Worker
const playwrightWorker = new Worker(path.resolve(__dirname, 'playwrightWorker.js'), {
    workerData: { url: 'https://www.nseindia.com/market-data/live-market-indices' }
  });
  playwrightWorker.on('message', (msg) => {
    console.log(`[Main] Message from Playwright Worker:`, msg);
    if (msg !== null && msg !==undefined  ){
        let html = msg.html;
        let indices = msg.indices;
          if(store !==undefined && store !==null){
                    if(indices !== undefined && indices !==null ){
        
                        store.set("indicesData", indices);
                        console.log("SERVER with NIFTY INDICES  UPDATED "+new Date().toLocaleDateString())
                        console.log(` ${JSON.stringify(indices)}`)
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

  });
  
  playwrightWorker.on('error', (err) => {
    console.error(`[Main] Playwright Worker Error:`, err);
  });
  
  playwrightWorker.on('exit', (code) => {
    console.log(`[Main] Playwright Worker stopped with exit code ${code}`);
  });
// Start the MongoDB Worker
const mongoWorker = new Worker(path.resolve(__dirname, 'mongoWorker.js'), {
    workerData: { mongoUri: 'mongodb://localhost:27017', dbName: 'myDatabase' }
  });
  
  mongoWorker.on('message', (msg) => {
    console.log(`[Main] Message from Mongo Worker:`, msg);

    if (msg !== null && msg !==undefined  ){
        let html = msg.html;
        let indices = msg.indices;
          if(store !==undefined && store !==null){
                    if(indices !== undefined && indices !==null  && Array.isArray(indices) && indices.length > 0){
        
                        store.set("indicesData", indices);
                        console.log("SERVER with NIFTY INDICES  UPDATED from MongoDB"+new Date().toLocaleDateString())
                        console.log(` ${JSON.stringify(indices)}`)
                    }
                    else {
                        let oldIndicies = store.get('indicesData');
                        if(oldIndicies!==null && oldIndicies !== undefined){
                            console.log("SERVER with NIFTY INDICES not UPDATED from MongoDB ")
                            console.log(` ${JSON.stringify(oldIndicies)}`)
        
                        }
        
                    }
                    if(html !== undefined && html !==null  &&  html !=="" ){
        
                        store.set("responsiveDashboardHtml", html);
                        console.log("SERVER with responsiveDashboardHtml NIFTY INDICES  UPDATED from MongoDB"+new Date().toLocaleDateString())
                        console.log(` ${html}`)
                    }




        
                }
                
    }




  });
  
  mongoWorker.on('error', (err) => {
    console.error(`[Main] Mongo Worker Error:`, err);
  });
  
  mongoWorker.on('exit', (code) => {
    console.log(`[Main] Mongo Worker stopped with exit code ${code}`);
  });


const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log("Started the backend server at port " + PORT)
    //startMarketPoller();
})
