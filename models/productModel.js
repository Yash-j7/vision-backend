import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: mongoose.ObjectId,
      ref: "Category",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    photo: {
      type: [String],
      required: true,
    },
    // shipping: {
    //   type: Boolean,
    // },
    bulkDiscounts: [
      {
        quantity: { type: Number, required: true },
        discount: { type: Number, required: true }, // percentage, e.g. 5 for 5%
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Products", productSchema);
