const { workerData, parentPort } = require('worker_threads');
const {
    Worker, isMainThread,  
  } = require('node:worker_threads');
  const fs =  require('node:fs');
const {   NiftyAllIndices } = require("./models/niftyallindices");
const {   NseAllIndices } = require("./models/nseallindices");
const store  = require( "store2");

let responsiveDashboardHtml = "";
let liveIndexTableHTML = "";
let liveIndicesData = [];
let i = 0;
let MAXWORKERTRIES = 4; 


//const outputFile = './mongodbworker_data.txt';
//const writeStream = fs.createWriteStream(outputFile, {
//    flags: 'a',
//  });
  const workerName = workerData.name;



async function checkDatabase() {
 
 // if(writeStream !==undefined && writeStream !==null){ 
    console.log(` [worker_write]${workerName} ${Date.now()}  Launching MongoDB for \r\n `);
  // }
    try {
     // the LOCAL to REMOTE SERVER approach failed so storing the 
             // responsiveDashboardHTML to MongoDB and it will reload it later at the REMOTE 
                 // Encode the HTML string to Base64
        //         const encodedHtml = Buffer.from(responsiveDashboardHtml, 'utf-8').toString('base64');
          let saveDate = Date.now();
              newindices = {  encodedHtml: '' , updatedAt:saveDate   }
              try { 
                while (i < MAXWORKERTRIES ) {  
               // Perform the upsert operation
               // Latest updated record
                const latestUpdated = await NiftyAllIndices.findOne().sort({ updatedAt: -1 });
                if(latestUpdated !==undefined && latestUpdated !== null){
                        // Decode the Base64 string back to pure HTML
                    const decodedHtml = Buffer.from(latestUpdated.encodedHtml, 'base64').toString('utf-8');
                    store.set('responsiveDashboardHtml',decodedHtml);
                    console.log("HTML successfully retrieved and decoded from Mongo DB");
                    responsiveDashboardHtml = decodedHtml
                    liveIndexTableHTML = decodedHtml;
                       if (isMainThread) {
                            }
                            else { 
                               // if(writeStream !==undefined && writeStream !==null){ 
                               console.log(`[worker_write]${workerName} ${Date.now()}   mongoDB worker seems to have parsed responsiveDashboardHtml nify live indices \r\n `);
                                console.log(`   ${liveIndexTableHTML } `);
                    
                                console.log(`  ----------- `);
                                console.log(`  -----------  `);
                                console.log(`   -----------  `);
                    
                                console.log(`  ${JSON.stringify(liveIndicesData)} `);
                           // }
                            } 




                    console.log(`${responsiveDashboardHtml}` );
                    // return decodedHtml;
                    break;
                }
                else {
                    console.log(" NIFTY INDICES responsiveDashboardHTML retrieved and decoded  MongoDB  FAILED   FAILED   FAILED .");
                }

                    i= i+1;
                        console.log(" mongodb worker psring "+i+" time nify live indices ")
                        if (isMainThread) {
                        }
                        else { 
                           // if(writeStream !==undefined && writeStream !==null){ 
                             console.log(`[worker_write]${workerName} ${Date.now()}      mongoDB  worker psring ${i} time nify live indices   \r\n  `);
                           
                
                          
                        // }
                        } 
                }
          
 
             } catch (error) {
                 console.error("Error retrieve MongoDB  record:", error);
               }
             if (isMainThread) {
                   }
                   else { 
                      // if(writeStream !==undefined && writeStream !==null){ 
                        console.log(`[worker_write]${workerName} ${Date.now()}    mongoDB   worker seems to have parsed nify live indices \r\n`);
                        console.log(`   ${liveIndexTableHTML } `);
           
                        console.log(`  ----------- `);
                        console.log(`  -----------  `);
                        console.log(`   -----------  `);
           
                        console.log(`  ${JSON.stringify(liveIndicesData)} `);
                 //  }
                   }     
     // parentPort.postMessage({ status: 'connected', message: 'Connected to MongoDB polling loop.' });
      if (liveIndexTableHTML !=="" || liveIndicesData.length > 0){  
             parentPort.postMessage({ status: 'success', data: { html: liveIndexTableHTML , indices : liveIndicesData } });      
     }
      else {
          // read from the nseallindices collection all the nifty indices data 

          try {
            // 1. EXECUTE UNIQUE DE-DUPLICATION AGGREGATION PIPELINE
            // This scans the collection, sorts by recent updates, and isolates unique documents by name
            const uniqueIndices = await NseAllIndices.aggregate([
                { 
                    // Step A: Sort everything descending by updatedAt so the freshest data floats to the top
                    $sort: { updatedAt: -1 } 
                },
                {
                    // Step B: Group by the unique index name field
                    $group: {
                        _id: "$name",
                        // Grabs the rest of the matching document fields from the freshest record
                        current: { $first: "$current" },
                        percentChange: { $first: "$percentChange" },
                        open: { $first: "$open" },
                        high: { $first: "$high" },
                        low: { $first: "$low" },
                        indicativeClose: { $first: "$indicativeClose" },
                        prevClose: { $first: "$prevClose" },
                        prevDay: { $first: "$prevDay" },
                        oneWeekAgo: { $first: "$oneWeekAgo" },
                        oneMonthAgo: { $first: "$oneMonthAgo" },
                        oneYearAgo: { $first: "$oneYearAgo" },
                        yearHigh: { $first: "$yearHigh" },
                        yearLow: { $first: "$yearLow" },
                        isNegative: { $first: "$isNegative" },
                        updatedAt: { $first: "$updatedAt" }
                    }
                },
                {
                    // Step C: Project the grouped fields back into a clean object structure
                    $project: {
                        _id: 0, // Hides the grouping ID
                        name: "$_id", // Restores the index name to its original property key
                        current: 1,
                        percentChange: 1,
                        open: 1,
                        high: 1,
                        low: 1,
                        indicativeClose: 1,
                        prevClose: 1,
                        prevDay: 1,
                        oneWeekAgo: 1,
                        oneMonthAgo: 1,
                        oneYearAgo: 1,
                        yearHigh: 1,
                        yearLow: 1,
                        isNegative: 1,
                        updatedAt: 1
                    }
                },
                {
                    // Step D: Sort alphabetically by index name so the cards preserve layout order
                    $sort: { name: 1 }
                }
            ]).exec();
    
            // 2. CHECK FOR EMPTY DATA RECORDS
            if (!uniqueIndices || uniqueIndices.length === 0) {
                console.warn("⚠️ Database query executed successfully, but collection 'nseallindices' contains zero records.");
               // if(writeStream !==undefined && writeStream !==null){ 
                        console.log(`[worker_write]${workerName} ${Date.now()}    mongoDB   worker Database query executed successfully, but collection 'nseallindices' contains zero records. \r\n`);
              //  }      
                 // Serve up the elegant offline placeholder playground state cleanly
               // const fallbackHtml = transformJsonToResponsiveCards(null);
             //   return res.status(200).send(fallbackHtml);
            }
            else {
                 let retreivedUniqueIndices  = Object.assign( {} , uniqueIndices);
                 store.set('indicesData',retreivedUniqueIndices);
                 liveIndicesData  = retreivedUniqueIndices; 

                 if (liveIndexTableHTML !=="" || liveIndicesData.length > 0){  
                   parentPort.postMessage({ status: 'success', data: { html: liveIndexTableHTML , indices : liveIndicesData } });      
                 }

            }
            console.log(`✅ Success! Pulled ${uniqueIndices.length} distinct index records from Atlas.`);
             // if(writeStream !==undefined && writeStream !==null){ 
                        console.log(`[worker_write]${workerName} ${Date.now()}    mongoDB   worker Success! Pulled ${uniqueIndices.length} distinct index records from Atlas. \r\n`);
              //  }      
            // 3. COMPILE STREAM INTO THE RESPONSIVE TAILWIND MATRIX CAROUSEL
           // const fullyCompiledHtml = transformJsonToResponsiveCards(uniqueIndices);
           // return res.status(200).send(fullyCompiledHtml);
    
        } catch (mongooseError) {
            // MONGOOSE & CONNECTION EXCEPTION HANDLING BLOCK
            console.error("🚨 Mongoose Query Exception Intercepted:", mongooseError.message);
          //  if(writeStream !==undefined && writeStream !==null){ 
                       console.log(`[worker_write]${workerName} ${Date.now()}    mongoDB   worker Mongoose Query Exception Intercepted: ${JSON.stringify( mongooseError.message)} \r\n`);
           //  }     
            // Fallback protection: Generate backup playground markup so user app frames never break
            // try {
            //     const recoveryHtml = transformJsonToResponsiveCards(null);
            //     return res.status(200).send(recoveryHtml);
            // } catch (compilationError) {
            //     console.error("Critical HTML generator malfunction:", compilationError.message);
            //     return res.status(500).send('<p style="font-family:sans-serif; text-align:center; padding:40px; color:#64748b;">Connection Timeout. Please refresh dashboard view.</p>');
            // }
        }


      }
  
    } catch (error) {
     // if(writeStream !==undefined && writeStream !==null){ 
         console.log(`[worker_started]${workerName}     mongoDB worker   ${JSON.stringify( error.message)} \r\n`);
    // }
      parentPort.postMessage({ status: 'connection_failed', error: error.message });
     // process.exit(1);
    }
      finally {
      //  if(writeStream !==undefined && writeStream !==null){ 
            console.log(`[worker_write]${workerName} ${Date.now()}     [worker_finished]${workerName}   \r\n  `);
     //   }
         // await browser.close();
        console.log('closeing the worker ')
    //process.exit(0); // Cleanly exit worker when task finishes
  }












  }
  
  checkDatabase();


  /*

    // Poll the database every 5 seconds
      setInterval(async () => {
        try {
          // Example: Look for documents marked as "pending"
          const pendingTasks = await collection.find({ status: 'pending' }).toArray();
          
          if (pendingTasks.length > 0) {
            parentPort.postMessage({ 
              status: 'data_found', 
              count: pendingTasks.length, 
              tasks: pendingTasks 
            });
          } else {
            parentPort.postMessage({ status: 'polling', message: 'No pending tasks found.' });
          }
        } catch (err) {
          parentPort.postMessage({ status: 'error', error: err.message });
        }
      }, 5000);

  */
