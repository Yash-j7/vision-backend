import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
    product_id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true }
}, { _id: false });

const OrderMetaSchema = new mongoose.Schema({
    order_id: { type: String, required: true, unique: true },
    products: { type: [ProductSchema], default: [] }
}, { timestamps: true });

export default mongoose.model("OrderMeta", OrderMetaSchema); 