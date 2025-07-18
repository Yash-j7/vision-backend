import mongoose from "mongoose";

const PaymentLogSchema = new mongoose.Schema({
    order_id: {
        type: String,
        required: true,
        index: true,
    },
    transaction_status: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    transaction_count: {
        type: Number,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    products: [
        {
            product_id: String,
            name: String,
            price: Number,
            quantity: Number,
            // Add more fields as needed
        }
    ],
});

export default mongoose.model("PaymentLog", PaymentLogSchema); 