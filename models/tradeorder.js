const mongoose = require('mongoose');

const TradeOrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderRef: { type: String, unique: true, required: true },
    symbol: { type: String, required: true },
    qty: { type: Number, required: true },
    side: { type: Number, enum: [1, -1] }, // 1: Buy, -1: Sell
    type: { type: Number },
    productType: { type: String },
    limitPrice: { type: Number },
    status: { type: String, default: 'SUBMITTED' },
    orderTag: { type: String },
    placedAt: { type: Date, default: Date.now }
});

const TradeOrder = mongoose.model('TradeOrder', TradeOrderSchema);
module.exports = TradeOrder;