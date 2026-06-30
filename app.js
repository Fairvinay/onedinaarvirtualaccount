const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const { rateLimit } = require('express-rate-limit');
const { ApolloServer } = require('apollo-server-express');
const http = require('http');
const https = require('https');
const state = require("./routes/routes")
const users = require("./routes/userRoutes.js")
const market = require("./routes/market.js")
const path = require('path');
const store  = require( "store2");
const { startMarketPoller } =
  require("./marketStatusWorker");
  const { Worker } = require('worker_threads');
  const fs =  require('node:fs');
//const outputFile = './backend_start_data.txt';
//const writeStream = fs.createWriteStream(outputFile, {
//    flags: 'a',
//  });

const writeStream = undefined;
const {
    startWorker,
    setAccessToken , connectMongo
}
=
require("./fyersHistoryWorker");
const historyRoutes =
require("./routes/historyRefresh");
// Add this at the very top of your file
//require('dotenv').config();
const app = express()

// Body Parser Middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));
// ---------------------------
// Global Worker State
// ---------------------------

global.workerRunning = false;


// Configure the rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes time window
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429, // Standard HTTP status for rate limiting
    standardHeaders: 'draft-7', // Send standard RateLimit-* headers
    legacyHeaders: false, // Disable the X-RateLimit-* headers
  });


// Apply the rate limiting middleware to all requests
app.use(limiter);

// Enable CORS for all routes
const corsOrigins = process.env.CORS_ORIGINS ? 
  process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : 
  ['https://192.168.1.6:8888','https://localhost:8888','https://onedinaar.com'];

const corsMethods = process.env.CORS_METHODS ? 
  process.env.CORS_METHODS.split(',').map(method => method.trim()) : 
  ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

const corsHeaders = process.env.CORS_HEADERS ? 
  process.env.CORS_HEADERS.split(',').map(header => header.trim()) : 
  ['Content-Type', 'Authorization','x-auth'];

// 1. Define your GraphQL schema and resolvers
const typeDefs = `#graphql
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello secured world!',
  },
};


/*
app.use(cors({
  origin: [
    ...corsOrigins,
    /^http:\/\/localhost:\d+$/,  // Allow any localhost port
    /^http:\/\/127\.0\.0\.1:\d+$/ // Allow any 127.0.0.1 port
  ],
  methods: corsMethods,
  allowedHeaders: corsHeaders,
  credentials: process.env.CORS_CREDENTIALS !== 'false',
  optionsSuccessStatus: 200 // Fixes preflight issues on some legacy browsers
}));*/
let allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', corsOrigins.join(""));
  res.header('Access-Control-Allow-Methods', corsMethods.join("")); // 'GET,PUT,POST,DELETE,OPTIONS,PATCH'
  res.header('Access-Control-Allow-Headers', corsHeaders.join("") ); // 'Content-Type, Authorization, Content-Length, X-Requested-With, x-auth'
  res.header('Access-Control-Expose-Headers', 'x-auth');

  // intercept OPTIONS method
  if ('OPTIONS' == req.method) {
      res.sendStatus(200);
  }
  else {
      next();
  }
};

 //app.use(allowCrossDomain)


// app.use(cors())
// 1. DYNAMICALLY DEFINE YOUR CORS ORIGINS
// Pull domains from environment variables for production, fallback to local variables for dev.
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) 
  : [
      'https://192.168.1.6:8888',
      'https://localhost:8888',
      'https://onedinaar.com'
    ];

// 2. CONFIGURE THE CORS ENGINE MIDDLEWARE
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or your internal background Workers)
    if (!origin) return callback(null, true);
    
    // Check if the incoming domain is explicitly whitelisted
    const isWhitelisted = allowedOrigins.indexOf(origin) !== -1;
    
    // Dynamic Regex matching to automatically allow any local preview ports
    const isLocalhost = /^https?:\/\/localhost:\d+$/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin);

    if (isWhitelisted || isLocalhost) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Blocked by CORS Core: ${origin}`);
      callback(new Error('Not allowed by CORS policy configuration'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-auth'],
  exposedHeaders: ['x-auth'], // Crucial if your frontend reads tokens directly from headers
  credentials: true, // Must be true if your app passes session cookies across domains
  preflightContinue: false,
  optionsSuccessStatus: 204 // Some legacy browsers choke on 200 for pre-flights; 204 No Content is standard
};

// 3. APPLY TO APPLICATION STACK
// CRITICAL: Place this BEFORE you define any of your route groups (app.use("/api", ...))
app.use(cors(corsOptions));

app.use("/state", state)
app.use("/users", users)
app.use("/api", market)
// ---------------------------
// REST APIs
// ---------------------------

app.use(
  "/api",
  historyRoutes
 );
app.get("/", (req, res) => {
    res.send("Hey There How are you?")
})
// Start Nifty 50 stocks get history 
const nifty50Worker = new Worker(path.resolve(__dirname, 'nifty50Worker.js'), {
  workerData: { url: `${process.env.FYERS_HISTORY_URL}`, name: "nifty50Worker" }
});
nifty50Worker.on('message', (msg) => {
  console.log(`[Main] Message from Nifty 50 GETHISTORY Worker:`, msg);
  //if(writeStream !==undefined && writeStream !==null){ 
  
        console.log(`  ${Date.now()}   Message from Nifty 50 GETHISTORY Worker:  \r\n `);
    
 //  }  
  if (msg !== null && msg !==undefined  ){
      let html = msg.html;
      let indices = msg.indices;
        if(store !==undefined && store !==null){
                  if(indices !== undefined && indices !==null ){
      
                      store.set("indicesData", indices);
                      console.log("SERVER with NIFTY INDICES  UPDATED "+new Date().toLocaleDateString())
                    //  if(writeStream !==undefined && writeStream !==null){ 
  
                        console.log(`  ${Date.now()}  Nifty 50 GETHISTORY Worker: SERVER with NIFTY INDICES  UPDATED  \r\n `);
                    
               //    }  
                      console.log(` ${JSON.stringify(indices)}`)
                  }
                  else {
                      let oldIndicies = store.get('indicesData');
                      if(oldIndicies!==null && oldIndicies !== undefined){
                          console.log("SERVER with NIFTY INDICES not UPDATED ")
                          console.log(` ${JSON.stringify(oldIndicies)}`)
                    //      if(writeStream !==undefined && writeStream !==null){ 
  
                           console.log(`  ${Date.now()}  Nifty 50 GETHISTORY Worker: SERVER with NIFTY INDICES not UPDATED  \r\n `);
                        
                  //         }  
      
                      }
      
                  }
      
              }
              
  }

});

nifty50Worker.on('error', (err) => {
  console.error(`[Main] Nifty 50 GETHISTORY  Worker Error:`, err);
});

nifty50Worker.on('exit', (code) => {
  console.log(`[Main] Nifty 50 GETHISTORY  Worker stopped with exit code ${code}`);
});



// Start the Playwright Worker
const playwrightWorker = new Worker(path.resolve(__dirname, 'playwrightWorker.js'), {
    workerData: { url: 'https://www.nseindia.com/market-data/live-market-indices' , name: "playwrightWorker" }
  });

 // if(writeStream !==undefined && writeStream !==null){ 
    if(playwrightWorker !==undefined && playwrightWorker !==null){ 
         console.log(`  ${Date.now()}   PLAYWRIGHT WORKER STARTED https://www.nseindia.com/market-data/live-market-indices  \r\n `);
    }
  //  }
 //  }  
  playwrightWorker.on('message', (msg) => {
    console.log(`[Main] Message from Playwright Worker:`, msg);
  //  if(writeStream !==undefined && writeStream !==null){ 
    
          console.log(`  ${Date.now()}   Message from Playwright Worker:  \r\n `);
      
   //  }  
    if (msg !== null && msg !==undefined  ){
        let html = msg.html;
        let indices = msg.indices;
          if(store !==undefined && store !==null){
                    if(indices !== undefined && indices !==null ){
        
                        store.set("indicesData", indices);
                        console.log("SERVER with NIFTY INDICES  UPDATED "+new Date().toLocaleDateString())
                       // if(writeStream !==undefined && writeStream !==null){ 
    
                          console.log(`  ${Date.now()}  Playwright Worker: SERVER with NIFTY INDICES  UPDATED  \r\n `);
                      
                   //  }  
                        console.log(` ${JSON.stringify(indices)}`)
                    }
                    else {
                        let oldIndicies = store.get('indicesData');
                        if(oldIndicies!==null && oldIndicies !== undefined){
                            console.log("SERVER with NIFTY INDICES not UPDATED ")
                            console.log(` ${JSON.stringify(oldIndicies)}`)
                           // if(writeStream !==undefined && writeStream !==null){ 
    
                              console.log(`  ${Date.now()}  Playwright Worker: SERVER with NIFTY INDICES not UPDATED  \r\n `);
                          
                          //   }  
        
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
    workerData: { mongoUri: 'mongodb://localhost:27017', dbName: 'myDatabase' ,  name: "mongoWorker" }
  });
  
  mongoWorker.on('message', (msg) => {
    console.log(`[Main] Message from Mongo Worker:`, msg);

   // if(writeStream !==undefined && writeStream !==null){ 
   //   if(mongoWorker !==undefined && mongoWorker !==null){ 
          console.log(`  ${Date.now()}   MONGO DB WORKER  STARTED   \r\n `);
    //  }
   //  }  
     
     
    if (msg !== null && msg !==undefined  ){
        let html = msg.html;
        let indices = msg.indices;
          if(store !==undefined && store !==null){
                    if(indices !== undefined && indices !==null  && Array.isArray(indices) && indices.length > 0){
        
                        store.set("indicesData", indices);
                        console.log("SERVER with NIFTY INDICES  UPDATED from MongoDB"+new Date().toLocaleDateString())
                        console.log(` ${JSON.stringify(indices)}`)
                     //   if(writeStream !==undefined && writeStream !==null){ 
    
                           console.log(`  ${Date.now()}  MONGO DB WORKER : SERVER with NIFTY INDICES  UPDATED from MongoDB \r\n `);
                      
                    //    }  

                    }
                    else {
                        let oldIndicies = store.get('indicesData');
                        if(oldIndicies!==null && oldIndicies !== undefined){
                            console.log("SERVER with NIFTY INDICES not UPDATED from MongoDB ")
                            console.log(` ${JSON.stringify(oldIndicies)}`)
                          //  if(writeStream !==undefined && writeStream !==null){ 
    
                               console.log(`  ${Date.now()}   MONGO DB WORKER : SERVER with NIFTY INDICES not UPDATED from MongoDB   \r\n `);
                          
                          //   }  
        
                        }
        
                    }
                    if(html !== undefined && html !==null  &&  html !=="" ){
        
                        store.set("responsiveDashboardHtml", html);
                        console.log("SERVER with responsiveDashboardHtml NIFTY INDICES  UPDATED from MongoDB"+new Date().toLocaleDateString())
                        console.log(` ${html}`)
                      //  if(writeStream !==undefined && writeStream !==null){ 
    
                          console.log(`  ${Date.now()}   MONGO DB WORKER : SERVER with responsiveDashboardHtml NIFTY INDICES  UPDATED from MongoDB   \r\n `);
                      
                      //   }  


                    }




        
                }
                
     }
   //   }



  });
  
  mongoWorker.on('error', (err) => {
    console.error(`[Main] Mongo Worker Error:`, err);
  });
  
  mongoWorker.on('exit', (code) => {
    console.log(`[Main] Mongo Worker stopped with exit code ${code}`);
  });

 /* const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer: httpsServer  })]
  });
  */
  // 2. Read SSL Certificate and Key
  /* const httpsOptions = {
    key: fs.readFileSync('ssl.key/server.key', 'utf8'),   // 🔑 private key,
    cert: fs.readFileSync('ssl.crt/server.crt', 'utf8'), // 📜 certificate
  };*/
   // const httpsServer = https.createServer(httpsOptions, app);
const PORT = process.env.PORT || 3001
/*
async function startServer() {
    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
      // Apply Apollo middleware to express
    server.applyMiddleware({ app });
   const httpServer = http.createServer(app);
   // 2. Attach the official v4 middleware interface wrapper to your route
  app.use(
      '/graphql',
      express.json(), // Ensures payload body-parsing works specifically for GraphQL operations
     // expressMiddleware(server)
  );

  // 3. Bind the combined application listener instance to the target port
  httpServer.listen(PORT, () => {
      console.log("Started the backend server at port " + PORT);
      
      if (corsOrigins.length > 0) {
          console.log(`CORS Origins: ${corsOrigins.join(', ')}`);
      }
      console.log(`CORS Methods: ${corsMethods.join(', ')}`);
      console.log(`CORS Headers: ${corsHeaders.join(', ')}`);
      console.log(`CORS Credentials: ${process.env.CORS_CREDENTIALS !== 'false'}`);
  });
}

// Execute the modern initialization framework sequence safely
startServer().catch(err => {
  console.error("🚨 Critical failure during Apollo Server initialization:", err);
});
*/





/*
server.start().then(() => {
  server.applyMiddleware({ app });
*/
  app.listen(PORT, () => {
    console.log("Started the backend server at port " + PORT)
        //startMarketPoller();
      // Log CORS configuration
      if (corsOrigins.length > 0) {
        console.log(`CORS Origins: ${corsOrigins.join(', ')}`);
    }
    console.log(`CORS Methods: ${corsMethods.join(', ')}`);
    console.log(`CORS Headers: ${corsHeaders.join(', ')}`);
    console.log(`CORS Credentials: ${process.env.CORS_CREDENTIALS !== 'false'}`);
  })
/*})*/
