const mongoose = require("mongoose");


const CandleSchema =
new mongoose.Schema(
{

    time:{
        type:String,
        required:true
    },

    open:Number,

    high:Number,

    low:Number,

    close:Number

},
{
    _id:false
});


const Nifty50Schema =
new mongoose.Schema(
{

    isin:{
        type:String,
        unique:true,
        index:true
    },


    symbol:{
        type:String
    },


    stockName:{
        type:String
    },


    candleData:[
        CandleSchema
    ],


    updatedAt:{
        type:Date,
        default:Date.now
    }


},
{
    collection:"nifty50stocks"
});


module.exports =
mongoose.model(
"Nifty50Stock",
Nifty50Schema
);