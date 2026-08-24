import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import express from "express";
import { prisma } from "./lib/prisma.js";
import customerRoute from "./routes/customer-route.js";
import opportunitiesRoute from "./routes/opportunities-route.js";


const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/customers", customerRoute);
app.use("/api/opportunities", opportunitiesRoute);

/**
 * Verifies the database connection is actually reachable before the
 * server starts accepting traffic. Fails fast with a clear message
 * instead of letting the first incoming request silently 500.
 */
async function verifyDatabaseConnection() {
  try {
    // Cheapest possible real query — just checks the connection works.
    await prisma.$queryRaw`SELECT 1`;
    console.log("✔ Database connection established");
    return true;
  } catch (error) {
    console.error("✘ Failed to connect to the database.");
    console.error("  Reason:", error.message);
    console.error("  Check that DATABASE_URL in .env is correct and reachable.");
    return false;
  }
}

async function start() {
  const dbOk = await verifyDatabaseConnection();

  if (!dbOk) {
    console.error("Server startup aborted — database connection failed.");
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start(); 