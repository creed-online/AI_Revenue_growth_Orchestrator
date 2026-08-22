/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropTable
DROP TABLE "Post";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "Merchant" (
    "id" SERIAL NOT NULL,
    "businessName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "industry" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPurchaseDate" TIMESTAMP(3),
    "firstPurchaseDate" TIMESTAMP(3),
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "isDiscountSensitive" BOOLEAN NOT NULL DEFAULT false,
    "isDormant" BOOLEAN NOT NULL DEFAULT false,
    "reactivationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "crossSellScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upsellScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "replenishmentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "isReplenishable" BOOLEAN NOT NULL DEFAULT false,
    "avgCycleDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "audienceSize" INTEGER NOT NULL DEFAULT 0,
    "offerType" TEXT,
    "offerValue" DOUBLE PRECISION,
    "expectedRevenue" DOUBLE PRECISION,
    "expectedCost" DOUBLE PRECISION,
    "expectedRoi" DOUBLE PRECISION,
    "actualRevenue" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "actualRoi" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignVariant" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "expectedConversion" DOUBLE PRECISION NOT NULL,
    "expectedRevenue" DOUBLE PRECISION NOT NULL,
    "expectedCost" DOUBLE PRECISION NOT NULL,
    "expectedNetRevenue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "maxDiscount" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "maxCampaignAudience" INTEGER NOT NULL DEFAULT 5000,
    "maxCampaignBudget" DOUBLE PRECISION NOT NULL DEFAULT 20000,
    "maxCampaignsPerCustomerPerMonth" INTEGER NOT NULL DEFAULT 2,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" INTEGER,
    "inputSummary" TEXT,
    "reason" TEXT,
    "confidence" DOUBLE PRECISION,
    "policyResult" TEXT,
    "executionResult" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignResult" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "audienceSize" INTEGER NOT NULL,
    "reach" INTEGER NOT NULL,
    "conversions" INTEGER NOT NULL,
    "conversionRate" DOUBLE PRECISION NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "campaignCost" DOUBLE PRECISION NOT NULL,
    "discountCost" DOUBLE PRECISION NOT NULL,
    "netRevenue" DOUBLE PRECISION NOT NULL,
    "roi" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignVariant" ADD CONSTRAINT "CampaignVariant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignResult" ADD CONSTRAINT "CampaignResult_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
