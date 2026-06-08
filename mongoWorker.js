const { workerData, parentPort } = require('worker_threads');
const {
    Worker, isMainThread,  
  } = require('node:worker_threads');
  const fs =  require('node:fs');
const {   NiftyAllIndices } = require("./models/niftyallindices")
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
             parentPort.postMessage({ status: 'success', data: { html: liveIndexTableHTML , indices : liveIndicesData } });      
    
  
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
