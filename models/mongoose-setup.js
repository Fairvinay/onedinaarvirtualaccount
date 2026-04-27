const mongoose = require("mongoose")
require('dotenv').config()

// Local Database
//const url = "mongodb://localhost:27017/wall-street"

// Mlab Database
// const url = `mongodb://${process.env.USERNAME}:${process.env.PASSWORD}@ds225308.mlab.com:25308/wall-street`
 const url = `mongodb+srv://fairvinay:${process.env.PASSWORD}@cluster0.9ke4d.mongodb.net/wall-street?retryWrites=true&w=majority`

 /*
mongoose.connect(url, { useNewUrlParser: true, useCreateIndex: true }).then(() => {
    console.log("Connected to DB")
})

*/
// Modern Mongoose handles everything for you!
mongoose.connect(url)
    .then(() => {
        console.log("✅ Connected to MongoDB Atlas successfully");
    })
    .catch((err) => {
        console.error("❌ Database connection error:", err);
    });

module.exports = {mongoose}