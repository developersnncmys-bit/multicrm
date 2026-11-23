// Entry point: connect to MongoDB, then start listening.
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

connectDB()
  .then(() => app.listen(env.port, () => console.log(`NNC CRM API → http://localhost:${env.port}/api`)))
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
