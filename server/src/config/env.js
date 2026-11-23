// Reads server/.env once and exposes typed settings.
import "dotenv/config";

const required = (key) => {
  if (!process.env[key]) {
    console.error(`Missing ${key} in server/.env (see server/.env.example)`);
    process.exit(1);
  }
  return process.env[key];
};

export const env = {
  mongoUri: required("MONGODB_URI"),
  dbName: process.env.DB_NAME || "nnc_crm",
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  port: Number(process.env.PORT) || 5000,
  origins: (process.env.CLIENT_ORIGIN || "*").split(",").map((s) => s.trim()).filter(Boolean),
  adminEmail: (process.env.ADMIN_EMAIL || "admin@nnc.in").toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
};
