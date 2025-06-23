import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import authRoutes from "./routes/authRoute.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoute.js";
import blogRoutes from "./routes/blogRoutes.js";
import paymentRoutes from "./routes/payment.js";
import cors from "cors";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/blog", blogRoutes);
app.use("/api/v1/payment", paymentRoutes);

app.get("/", (req, res) => {
    res.send("Hello World!");
});

const port = process.env.PORT;
app.listen(port, () => {
    console.log(`server running on ${port}`);
}); 