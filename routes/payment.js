import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import "dotenv/config";
import Payment from "../models/payment.js";
import PaymentLog from "../models/PaymentLog.js";
import OrderMeta from "../models/OrderMeta.js";
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { PaymentHandler, validateHMAC_SHA256 } from "../PaymentHandler.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// ROUTE 1 : Create Order Api Using POST Method http://localhost:4000/api/payment/order
router.post("/order", (req, res) => {
  const { amount } = req.body;
  console.log("amount", amount);
  try {
    const options = {
      amount: Number(amount * 100),
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
    };

    razorpayInstance.orders.create(options, (error, order) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: "Something Went Wrong!" });
      }
      res.status(200).json({ data: order });
      console.log(order);
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error!" });
    console.log(error);
  }
});

// ROUTE 2 : Create Verify Api Using POST Method http://localhost:4000/api/payment/verify
router.post("/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  console.log(req.body);
  console.log(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  // console.log("req.body", req.body);

  try {
    // Create Sign
    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    // Create ExpectedSign
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(sign.toString())
      .digest("hex");

    // console.log(razorpay_signature === expectedSign);

    // Create isAuthentic
    const isAuthentic = expectedSign === razorpay_signature;

    // Condition
    if (isAuthentic) {
      const payment = new Payment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      // Save Payment
      await payment.save();

      // Log payment details in PaymentLog
      const order_id = razorpay_order_id; // Using Razorpay order ID as order_id
      const transaction_status = "SUCCESS";
      const amount = req.body.amount || 0;
      // Count previous transactions for this order
      const transaction_count = await PaymentLog.countDocuments({ order_id }) + 1;
      const products = req.body.products || [];
      await PaymentLog.create({
        order_id,
        transaction_status,
        amount,
        transaction_count,
        products,
      });

      // Send Message to Frontend
      res.json({
        message: "Payement Successfully",
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error!" });
    console.log(error);
  }
});

// HDFC Payment Gateway Integration
// POST /api/v1/payment/hdfc/initiate
router.post("/hdfc/initiate", async (req, res) => {
  console.log("Received products:", req.body.products);
  try {
    let { amount, customer, orderId, redirectUrl } = req.body;
    // Generate unique order_id <= 21 chars
    if (!orderId) {
      const ts = Date.now().toString(36);
      const rand = Math.random().toString(36).substring(2, 6);
      orderId = ("ORD" + ts + rand).substring(0, 21);
    } else if (orderId.length > 21) {
      orderId = orderId.substring(0, 21);
    }
    // Save products to OrderMeta for this order_id (must be before any return/response)
    const { products = [] } = req.body;
    console.log("Saving OrderMeta for order_id:", orderId, "with products:", products);
    try {
      const metaDoc = await OrderMeta.findOneAndUpdate(
        { order_id: orderId.trim() },
        { products },
        { upsert: true, new: true }
      );
      console.log("OrderMeta saved:", metaDoc);
    } catch (metaErr) {
      console.error("Failed to save OrderMeta:", metaErr);
    }
    // Generate unique customer_id
    let customer_id = customer?.customer_id || customer?.customer_email || ("guest_" + Math.random().toString(36).substring(2, 10));
    // Prepare customer details
    const customer_details = {
      customer_id,
      customer_email: customer?.customer_email,
      customer_phone: customer?.customer_phone || "",
      customer_name: customer?.customer_name,
    };
    // Validate required fields
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid or missing amount (must be > 0, in INR)" });
    }
    if (!customer_details.customer_id || !customer_details.customer_email || !customer_details.customer_name) {
      return res.status(400).json({ message: "Missing customer details (id, email, name required)" });
    }
    if (!redirectUrl) {
      return res.status(400).json({ message: "Missing redirectUrl" });
    }
    // Prepare params as per HDFC kit requirements (use HDFC sample field names)
    const params = {
      order_id: orderId,
      amount: amount, // Use the amount from the cart/frontend (in INR)
      customer_details: {
        ...customer_details,
        customer_phone: "7001449884", // 10 digits, no leading zero (for HDFC validation)
      },
      // Force return_url to production backend endpoint for Render
      return_url: "http://localhost:8080/api/v1/payment/hdfc/callback",
      currency: "INR",
    };
    console.log("HDFC INITIATE PARAMS:", params);
    // Initialize PaymentHandler
    const paymentHandler = PaymentHandler.getInstance(path.resolve(__dirname, '../hdfc-config.json'));
    // Create order session
    const session = await paymentHandler.orderSession(params);
    console.log("HDFC SESSION RESPONSE:", session);
    // Respond with payment page URL or form
    res.json({ payment_url: session.payment_url, session });
  } catch (error) {
    console.error("HDFC INITIATE ERROR:", error);
    if (error && typeof error === 'object') {
      try { console.error('Full HDFC error object:', JSON.stringify(error, null, 2)); } catch (e) { console.error(error); }
    }
    res.status(500).json({ message: "Failed to initiate HDFC payment", error: error.message });
  }
});

// POST /api/v1/payment/hdfc/callback
router.post("/hdfc/callback", async (req, res) => {
  // Debug logs for callback POST
  console.log('--- HDFC CALLBACK DEBUG ---');
  console.log('HDFC Callback Headers:', req.headers);
  console.log('HDFC Callback Body:', req.body);
  if (req.rawBody) {
    console.log('HDFC Callback Raw Body:', req.rawBody);
  } else {
    console.log('HDFC Callback Raw Body: <not present>');
  }
  try {
    const { order_id } = req.body;
    const paymentHandler = PaymentHandler.getInstance(path.resolve(__dirname, '../hdfc-config.json'));
    // Verify signature
    if (!validateHMAC_SHA256(req.body, paymentHandler.getResponseKey())) {
      return res.status(400).send("Signature verification failed");
    }
    // Check order status
    const orderStatusResp = await paymentHandler.orderStatus(order_id);
    // Ensure order_id is trimmed
    const trimmedOrderId = (order_id || '').trim();
    console.log("HDFC CALLBACK: Looking for OrderMeta with order_id:", trimmedOrderId);
    let products = [];
    try {
      const meta = await OrderMeta.findOne({ order_id: trimmedOrderId });
      console.log("HDFC CALLBACK: Found OrderMeta:", meta);
      if (meta && Array.isArray(meta.products)) {
        products = meta.products;
      }
    } catch (metaErr) {
      console.error("Failed to fetch OrderMeta in callback:", metaErr);
    }
    // Log payment details in PaymentLog
    const transaction_status = orderStatusResp.status || "UNKNOWN";
    const amount = orderStatusResp.amount || 0;
    const transaction_count = await PaymentLog.countDocuments({ order_id }) + 1;
    await PaymentLog.create({
      order_id,
      transaction_status,
      amount,
      transaction_count,
      products,
    });
    // Redirect to frontend callback page with order_id as query param
    return res.redirect(`https://vision-frontend-m4a4.onrender.com/payment/callback?order_id=${order_id}`);
  } catch (error) {
    console.error("HDFC CALLBACK ERROR:", error);
    res.status(500).json({ message: "Failed to handle HDFC callback", error: error.message });
  }
});

// GET /api/v1/payment/status?order_id=...
router.get('/status', async (req, res) => {
  const { order_id } = req.query;
  if (!order_id) {
    return res.status(400).json({ message: 'Missing order_id' });
  }
  try {
    const paymentHandler = PaymentHandler.getInstance(path.resolve(__dirname, '../hdfc-config.json'));
    const orderStatus = await paymentHandler.orderStatus(order_id);
    console.log('HDFC orderStatus:', orderStatus); // Debug log
    res.json({ status: 'success', order: orderStatus });
  } catch (error) {
    console.error('Order status error:', error); // Debug log
    res.status(500).json({ status: 'failed', message: error.message });
  }
});

export default router;
