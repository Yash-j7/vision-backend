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

console.log("✅ Starting server initialization...");

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://www.visiongifting.com"
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/blog", blogRoutes);
app.use("/api/v1/payment", paymentRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

console.log("⏳ Attempting MongoDB connection...");

connectDb()
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server listening on http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("⚠️ DB connection failed:", err.message);
    console.log("➡️ Starting server anyway to satisfy Cloud Run health check...");
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server listening (DB failed) on http://${HOST}:${PORT}`);
    });
  });
