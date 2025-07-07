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

app.use(cors({
  origin: ['http://localhost:5173', 'https://vision-frontend-m4a4.onrender.com'],
  credentials: true // If you're using cookies or authentication
}));
// Only use express.urlencoded for parsing POST bodies
app.use(express.urlencoded({ extended: true }));

// Very raw body logger for debugging before any parser
app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    if (data) {
      console.log('Very Raw body:', data);
    }
    next();
  });
});

// Minimal test route for browser form POST
app.post('/test-form', (req, res) => {
  console.log('Test Form Headers:', req.headers);
  console.log('Test Form Body:', req.body);
  res.send('OK');
});

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
