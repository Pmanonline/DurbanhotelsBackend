import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  const DATABASE_URI = process.env.DATABASE_URI!;

  try {
    await mongoose.connect(DATABASE_URI);
  } catch (error: any) {
    throw new Error(error);
  }
};

export default connectDB;
