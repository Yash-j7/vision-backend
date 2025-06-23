import express from "express";
import { requireSignIn, isAdmin } from "../middleware/authMiddleware.js";
import slugify from "slugify";
import Blog from "../models/blogModel.js";

const router = express.Router();

// Create blog
router.post("/create-blog", requireSignIn, isAdmin, async (req, res) => {
    try {
        const { title, content, thumbnail, images } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }
        if (!content) {
            return res.status(400).json({ success: false, message: "Content is required" });
        }
        if (!thumbnail) {
            return res.status(400).json({ success: false, message: "Thumbnail is required" });
        }

        const slug = slugify(title, { lower: true });

        const blog = await new Blog({
            title,
            content,
            thumbnail,
            images,
            slug,
            author: req.user._id
        }).save();

        res.status(201).json({
            success: true,
            message: "Blog created successfully",
            blog
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error in creating blog",
            error: error.message
        });
    }
});

// Get all blogs
router.get("/get-blogs", async (req, res) => {
    try {
        const blogs = await Blog.find({})
            .populate("author", "name")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            blogs
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error in getting blogs",
            error: error.message
        });
    }
});

// Get single blog
router.get("/get-blog/:slug", async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug })
            .populate("author", "name");

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found"
            });
        }

        res.status(200).json({
            success: true,
            blog
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error in getting blog",
            error: error.message
        });
    }
});

// Search blogs
router.get("/search-blog/:keyword", async (req, res) => {
    try {
        const keyword = req.params.keyword;
        const blogs = await Blog.find({
            $or: [
                { title: { $regex: keyword, $options: "i" } },
                { content: { $regex: keyword, $options: "i" } }
            ]
        }).populate("author", "name");

        res.status(200).json({
            success: true,
            blogs
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error in searching blogs",
            error: error.message
        });
    }
});

// Delete blog
router.delete("/delete-blog/:id", requireSignIn, isAdmin, async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Blog deleted successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error in deleting blog",
            error: error.message
        });
    }
});

export default router; 