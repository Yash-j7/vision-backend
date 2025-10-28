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

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://www.visiongifting.com",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/blog", blogRoutes);
app.use("/api/v1/payment", paymentRoutes);

// Root route for health check
app.get("/", (req, res) => {
  res.send("✅ Vision Backend is Running");
});

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

// --- START SERVER IMMEDIATELY ---
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on http://${HOST}:${PORT}`);
});

// --- CONNECT DB IN BACKGROUND ---
connectDb()
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("⚠️ MongoDB connection failed:", err.message));
