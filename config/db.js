import mongoose from "mongoose";

const connectDb = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    const conn = await mongoose.connect(process.env.MONGODB_URL, {
      serverSelectionTimeoutMS: 5000, // fail fast in 5s if can't connect
    });
    console.log(`✅ Connected to database: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`);
    throw error; // ensure .catch() runs in app.js
  }
};

export default connectDb;
