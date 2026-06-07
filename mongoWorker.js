const { workerData, parentPort } = require('worker_threads');

const {   NiftyAllIndices } = require("./models/niftyallindices")
let responsiveDashboardHtml = "";
let liveIndexTableHTML = "";
let liveIndicesData = [];
let i = 0;
let MAXWORKERTRIES = 15; 
async function checkDatabase() {
 
  
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
                    console.log(`${responsiveDashboardHtml}` );
                    // return decodedHtml;
                    break;
                }
                else {
                    console.log(" NIFTY INDICES responsiveDashboardHTML retrieved and decoded  MongoDB  FAILED   FAILED   FAILED .");
                }

                    i= i+1;
                        console.log(" mongodb worker psring "+i+" time nify live indices ")
                }
          
 
             } catch (error) {
                 console.error("Error retrieve MongoDB  record:", error);
               }
  
     // parentPort.postMessage({ status: 'connected', message: 'Connected to MongoDB polling loop.' });
             parentPort.postMessage({ status: 'success', data: { html: liveIndexTableHTML , indices : liveIndicesData } });      
    
  
    } catch (error) {
      parentPort.postMessage({ status: 'connection_failed', error: error.message });
      process.exit(1);
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