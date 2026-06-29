const express =
require("express");


const router =
express.Router();



const {
    startWorker,
    setAccessToken
}
=
require("../fyersHistoryWorker");





router.post(
"/refresh-history",
async(req,res)=>{


const token =
req.body.accessToken;



if(!token)
{

 return res.status(400)
 .json({

 error:
 "FYERS token missing"

 });

}





if(global.workerRunning)
{

return res.json({

status:
"busy",

message:
"Worker already running"

});


}




// start async

require("../app")
;



setTimeout(
()=>{


 setAccessToken(
    token
 );


 startWorker();


},
100
);





res.json({

status:
"started",

message:
"History refresh started"

});



});




module.exports =
router;