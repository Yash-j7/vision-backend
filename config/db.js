import mongoose from "mongoose";

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL);
    console.log(`connected to database ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
     // Exit with failure
  }
};

export default connectDb;
