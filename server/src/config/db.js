// MongoDB connection (Mongoose) + first-run admin account.
import mongoose from "mongoose";
import { env } from "./env.js";
import User from "../models/User.js";

// Connect once and reuse the connection (important on serverless hosts like Vercel,
// where the same warm instance handles many requests).
let connecting = null;
export function connectDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) {
    mongoose.set("strictQuery", true);
    connecting = mongoose.connect(env.mongoUri, { dbName: env.dbName, serverSelectionTimeoutMS: 15000 })
      .then(async () => { console.log(`MongoDB connected → ${mongoose.connection.host} / ${env.dbName}`); await ensureAdmin(); })
      .catch((e) => { connecting = null; throw e; });
  }
  return connecting;
}

// When the users collection is empty, create the admin from .env so someone can sign in
async function ensureAdmin() {
  if (await User.countDocuments()) return;
  const admin = new User({ id: "u1", name: "Admin User", email: env.adminEmail, role: "Admin", branch: "Bangalore", active: true, _ord: 0 });
  await admin.setPassword(env.adminPassword);
  await admin.save();
  console.log(`Created first admin: ${env.adminEmail}`);
}
