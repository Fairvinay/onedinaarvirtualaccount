const {mongoose} = require('./mongoose-setup');
//const uniqueValidator = require('mongoose-unique-validator');
//const validator = require('validator');
//const mongoose = require('mongoose');
const _ = require('lodash');

// 1. DEFINING THE STANDALONE DIRECT SCHEMA LAYER
const NseAllIndicesSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true,
        unique: true // Guarantees you can safely upsert by index name (e.g., "NIFTY 50")
    },
    current: { type: String, default: 'N/A' },
    percentChange: { type: String, default: '0.00' },
    open: { type: String, default: 'N/A' },
    high: { type: String, default: 'N/A' },
    low: { type: String, default: 'N/A' },
    indicativeClose: { type: String, default: 'N/A' },
    prevClose: { type: String, default: 'N/A' },
    prevDay: { type: String, default: 'N/A' },
    oneWeekAgo: { type: String, default: 'N/A' },
    oneMonthAgo: { type: String, default: 'N/A' },
    oneYearAgo: { type: String, default: 'N/A' },
    yearHigh: { type: String, default: 'N/A' },
    yearLow: { type: String, default: 'N/A' },
    isNegative: { type: Boolean, default: false }
}, { 
    // Forces Mongoose to explicitly route queries to your chosen collection name
    collection: 'nseallindices', 
    // Auto-manages createdAt and updatedAt records behind the scenes
    timestamps: true 
});

// 2. INTEGRATING THE LODASH CUSTOM OBJECT DICTIONARY FILTER
NseAllIndicesSchema.methods.toJSON = function () {
    const nseIndexDocument = this;
    const nseIndexObject = nseIndexDocument.toObject();
    
    // Explicit list of properties returned to your web frontend layout
    return _.pick(nseIndexObject, [
        '_id', 
        'name', 
        'current', 
        'percentChange', 
        'open', 
        'high', 
        'low', 
        'indicativeClose', 
        'prevClose', 
        'prevDay', 
        'oneWeekAgo', 
        'oneMonthAgo', 
        'oneYearAgo', 
        'yearHigh', 
        'yearLow', 
        'isNegative',
        'updatedAt'
    ]);
};

// 3. MODEL COMPILATION AND EXPORT
// Compiles the schema blueprints into a functional engine collection model
const NseAllIndices = mongoose.model('NseAllIndices', NseAllIndicesSchema);

module.exports = { NseAllIndices };