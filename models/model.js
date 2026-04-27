const {mongoose} = require("./mongoose-setup")
//const uniqueValidator = require('mongoose-unique-validator');

require('dotenv').config()

const Schema = mongoose.Schema

const moneySchema = new Schema({
    money: {
        type: Number,
        required: true,
        default: 10000
    },
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        unique: true,
        required: true
    }
})

const companySchema = new Schema({
    companyName: { type: String, required: true },
    company: { type: String, required: true },
    quantity: { type: Number, required: true },
    buyPrice: { type: Number, required: true },
    currPrice: { type: Number, required: true },
    shareWorth: { type: Number, required: true },
    profitLoss: { type: Number, required: true },
    _creator: { type: mongoose.Schema.Types.ObjectId, required: true }

     /**
      * 
    4. Small Cleanup (Optional)
    In your companySchema, since you are using _creator to link to the User, you might want to add a ref to make "Populating" data easier in the future:
 
    _creator: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        ref: 'User' // Adds the ability to use .populate('_creator') later
    }
      */
})
/**
 * 
 The error message "Query.prototype.countDocuments() no longer accepts a callback" is a classic version mismatch issue between Mongoose (v6+) 
 and a library called mongoose-unique-validator.

Mongoose 6 and 7 removed support for callbacks in favor of Promises. The mongoose-unique-validator plugin uses 
countDocuments() internally with a callback, which is now crashing your Portfolio model validation.

// Remove these lines if they exist:
const uniqueValidator = require('mongoose-unique-validator');
// ...
portfolioSchema.plugin(uniqueValidator); // <--- DELETE THIS LINE

 */
//moneySchema.plugin(uniqueValidator)
//companySchema.plugin(uniqueValidator)

module.exports = {
    Money: mongoose.model("Money", moneySchema),
    Portfolio: mongoose.model("Portfolio", companySchema)
}