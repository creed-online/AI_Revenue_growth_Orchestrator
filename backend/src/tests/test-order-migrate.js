import { prisma } from '../lib/prisma.js';

async function checkAndMigrateOrder() {
  console.log("Checking columns for Order in PostgreSQL...");
  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name ILIKE 'Order' OR table_name = 'orders'
    ORDER BY ordinal_position;
  `);
  console.log("Current DB Order Columns:", columns);

  const existingColNames = columns.map(c => c.column_name.toLowerCase());
  console.log("Existing column names:", existingColNames);

  const neededColumns = [
    { name: 'campaignId', type: 'INTEGER REFERENCES "Campaign"("id") ON DELETE SET NULL' },
    { name: 'attributionType', type: 'TEXT' },
    { name: 'discountAmount', type: 'DOUBLE PRECISION DEFAULT 0' },
    { name: 'isTestMode', type: 'BOOLEAN DEFAULT FALSE' }
  ];

  for (const col of neededColumns) {
    if (!existingColNames.includes(col.name.toLowerCase())) {
      console.log(`Adding missing column "${col.name}" (${col.type}) to "Order"...`);
      try {
        await prisma.$queryRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};`);
      } catch (err) {
        console.warn(`Attempt without foreign key:`, err.message);
        await prisma.$queryRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type.split(' ')[0]};`);
      }
    } else {
      console.log(`Column "${col.name}" already exists.`);
    }
  }

  // Create index on campaignId
  try {
    await prisma.$queryRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_campaignId_idx" ON "Order"("campaignId");`);
    console.log("Index on Order.campaignId ensured.");
  } catch (err) {
    console.log("Index status:", err.message);
  }

  const updatedColumns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name ILIKE 'Order' OR table_name = 'orders'
    ORDER BY ordinal_position;
  `);
  console.log("\nUpdated Order DB Columns:", updatedColumns);
}

checkAndMigrateOrder()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

