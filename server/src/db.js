// MongoDB connection + small helpers. Records keep the frontend's string `id`;
// Mongo's own _id is never sent to the client. `_ord` keeps list order (lower = first).
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { config, COLLECTIONS } from "./config.js";

let client;
export let db;

export async function connect() {
  client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  db = client.db(config.dbName);
  await Promise.all(Object.keys(COLLECTIONS).map((c) => db.collection(c).createIndex({ id: 1 }, { unique: true })));
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await ensureAdmin();
  return db;
}
export const close = () => client?.close();

export const col = (name) => db.collection(name);
export const clean = ({ _id, _ord, passwordHash, password, ...rest }) => rest; // never leak secrets or internals
export const hash = (pw) => bcrypt.hash(String(pw), 10);

// Turns a plain `password` from the client into `passwordHash`
export async function withHashedPassword(rec) {
  const out = { ...rec };
  if (out.password) out.passwordHash = await hash(out.password);
  delete out.password;
  return out;
}

// First run: create the admin from .env so someone can sign in
async function ensureAdmin() {
  if (await col("users").countDocuments()) return;
  await col("users").insertOne({
    id: "u1", name: "Admin User", email: config.adminEmail.toLowerCase(), passwordHash: await hash(config.adminPassword),
    role: "Admin", branch: "Bangalore", phone: "", active: true, _ord: 0,
  });
  console.log(`Created first admin: ${config.adminEmail}`);
}
