import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";
import campaignRoute from "./routes/campaign-route.js";
import customerRoute from "./routes/customer-route.js";
import opportunitiesRoute from "./routes/opportunities-route.js";
import policyRoute from "./routes/policy-route.js";
import orchestratorRoute from "./routes/orchestrator-route.js";
import approvalRoutes from "./routes/approval-route.js";
import campaignsRoute from "./routes/campaigns-route.js";
import authRoute from "./routes/auth-route.js";
import { optionalAuth } from "./middleware/auth.js";
import { ensureDemoMerchantCredentials } from "./services/authService.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());
app.use(optionalAuth);

app.use("/api/auth", authRoute);
app.use("/api", campaignRoute);
app.use("/api", policyRoute);
app.use("/api", orchestratorRoute);
app.use("/api/customers", customerRoute);
app.use("/api/opportunities", opportunitiesRoute);
app.use("/api/approvals", approvalRoutes);
app.use("/api/campaigns", campaignsRoute);

async function verifyDatabaseConnection() {
  try {
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

  try {
    const merchant = await ensureDemoMerchantCredentials();
    if (merchant) {
      console.log(`✔ Demo merchant credentials ready (${merchant.email})`);
    }
  } catch (error) {
    console.warn("⚠ Could not bootstrap demo credentials:", error.message);
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start();
