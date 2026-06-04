-- CreateTable
CREATE TABLE "PaymeWebhookLog" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "errorCode" INTEGER,
    "errorMsg" TEXT,
    "orderId" TEXT,
    "paymeId" TEXT,
    "durationMs" INTEGER NOT NULL,
    "isTestMode" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymeWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymeWebhookLog_clinicId_createdAt_idx" ON "PaymeWebhookLog"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymeWebhookLog_clinicId_errorCode_idx" ON "PaymeWebhookLog"("clinicId", "errorCode");

-- CreateIndex
CREATE INDEX "PaymeWebhookLog_createdAt_idx" ON "PaymeWebhookLog"("createdAt");
