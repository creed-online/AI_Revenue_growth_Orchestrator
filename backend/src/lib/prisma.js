import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

// Universal import for PrismaClient (supports both local workspace and Docker container directory structures)
let PrismaClient;
try {
  const mod = await import("../../generated/prisma/client.js").catch(() =>
    import("../../../generated/prisma/client.js").catch(() =>
      import("../../../generated/prisma/client.ts")
    )
  );
  PrismaClient = mod.PrismaClient;
} catch {
  const mod = await import("../../../generated/prisma/client.ts").catch(() =>
    import("@prisma/client")
  );
  PrismaClient = mod.PrismaClient;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma, pool };