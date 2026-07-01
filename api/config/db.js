import mongoose from 'mongoose';

let cachedConnection = null;

export const connectDB = async () => {
  if (cachedConnection) return cachedConnection;
  cachedConnection = await mongoose.connect(process.env.MONGODB_URI);
  return cachedConnection;
};
