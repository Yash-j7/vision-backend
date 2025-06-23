import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
        },
        thumbnail: {
            type: String,
            required: true,
        },
        images: [{
            type: String,
        }],
        slug: {
            type: String,
            required: true,
            unique: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Blog", blogSchema); 