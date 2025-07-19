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
        enum: ['CHARGED', 'SUCCESS', 'COMPLETED', 'FAILED', 'PENDING', 'CANCELLED', 'UNKNOWN'],
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    transaction_count: {
        type: Number,
        required: true,
        min: 1,
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
    // Additional security fields
    payment_gateway: {
        type: String,
        default: 'HDFC',
    },
    gateway_transaction_id: {
        type: String,
        required: false,
    },
    signature_verified: {
        type: Boolean,
        default: false,
    },
});

// Create compound unique index to prevent duplicate successful payments
PaymentLogSchema.index(
    {
        order_id: 1,
        transaction_status: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            transaction_status: { $in: ['CHARGED', 'SUCCESS', 'COMPLETED'] }
        }
    }
);

export default mongoose.model("PaymentLog", PaymentLogSchema); 