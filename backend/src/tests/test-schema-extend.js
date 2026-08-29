import { prisma } from '../lib/prisma.js';

async function checkAndMigrateNotificationSend() {
  console.log("Checking columns for NotificationSend in PostgreSQL...");
  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name ILIKE 'NotificationSend'
    ORDER BY ordinal_position;
  `);
  console.log("Current DB Columns:", columns);

  // Check which columns are missing and add them via ALTER TABLE if needed
  const existingColNames = columns.map(c => c.column_name.toLowerCase());
  console.log("Existing column names:", existingColNames);

  const neededColumns = [
    { name: 'trackingToken', type: 'TEXT' },
    { name: 'openedAt', type: 'TIMESTAMP(3)' },
    { name: 'clickedAt', type: 'TIMESTAMP(3)' },
    { name: 'openCount', type: 'INTEGER DEFAULT 0' },
    { name: 'clickCount', type: 'INTEGER DEFAULT 0' },
    { name: 'ipAddress', type: 'TEXT' },
    { name: 'userAgent', type: 'TEXT' }
  ];

  for (const col of neededColumns) {
    if (!existingColNames.includes(col.name.toLowerCase())) {
      console.log(`Adding missing column "${col.name}" (${col.type}) to "NotificationSend"...`);
      await prisma.$queryRawUnsafe(`ALTER TABLE "NotificationSend" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};`);
    } else {
      console.log(`Column "${col.name}" already exists.`);
    }
  }

  // Create unique index on trackingToken if not exists
  try {
    await prisma.$queryRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSend_trackingToken_key" ON "NotificationSend"("trackingToken");`);
    console.log("Unique index on trackingToken ensured.");
  } catch (err) {
    console.log("Index status:", err.message);
  }

  const updatedColumns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name ILIKE 'NotificationSend'
    ORDER BY ordinal_position;
  `);
  console.log("\nUpdated NotificationSend DB Columns:", updatedColumns);
}

checkAndMigrateNotificationSend()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

