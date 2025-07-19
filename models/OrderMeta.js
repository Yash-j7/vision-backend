import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
    product_id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const OrderMetaSchema = new mongoose.Schema({
    order_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    products: {
        type: [ProductSchema],
        default: []
    },
    // Payment validation fields
    expected_amount: {
        type: Number,
        required: true,
        min: 0,
    },
    payment_status: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
        default: 'PENDING',
    },
    payment_gateway: {
        type: String,
        default: 'HDFC',
    },
    customer_details: {
        customer_id: String,
        customer_email: String,
        customer_phone: String,
        customer_name: String,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    }
}, { timestamps: true });

// Pre-save middleware to calculate expected_amount from products
OrderMetaSchema.pre('save', function (next) {
    if (this.products && this.products.length > 0) {
        this.expected_amount = this.products.reduce((total, product) => {
            return total + (product.price * product.quantity);
        }, 0);
    }
    this.updated_at = new Date();
    next();
});

export default mongoose.model("OrderMeta", OrderMetaSchema); 