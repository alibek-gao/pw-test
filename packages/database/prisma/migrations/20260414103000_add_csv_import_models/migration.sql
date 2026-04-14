-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UrlRecord" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "rootDomain" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "aiModelMentioned" TEXT NOT NULL,
    "citationsCount" INTEGER NOT NULL,
    "sentiment" TEXT NOT NULL,
    "visibilityScore" INTEGER NOT NULL,
    "competitorMentioned" TEXT NOT NULL,
    "queryCategory" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "trafficEstimate" INTEGER NOT NULL,
    "domainAuthority" INTEGER NOT NULL,
    "mentionsCount" INTEGER NOT NULL,
    "positionInResponse" INTEGER NOT NULL,
    "responseType" TEXT NOT NULL,
    "geographicRegion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UrlRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportError" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "rawRow" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");

-- CreateIndex
CREATE INDEX "UrlRecord_importJobId_idx" ON "UrlRecord"("importJobId");

-- CreateIndex
CREATE INDEX "UrlRecord_rootDomain_idx" ON "UrlRecord"("rootDomain");

-- CreateIndex
CREATE INDEX "UrlRecord_lastUpdated_idx" ON "UrlRecord"("lastUpdated");

-- CreateIndex
CREATE INDEX "UrlRecord_aiModelMentioned_idx" ON "UrlRecord"("aiModelMentioned");

-- CreateIndex
CREATE INDEX "UrlRecord_sentiment_idx" ON "UrlRecord"("sentiment");

-- CreateIndex
CREATE INDEX "UrlRecord_geographicRegion_idx" ON "UrlRecord"("geographicRegion");

-- CreateIndex
CREATE INDEX "ImportError_importJobId_idx" ON "ImportError"("importJobId");

-- AddForeignKey
ALTER TABLE "UrlRecord" ADD CONSTRAINT "UrlRecord_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportError" ADD CONSTRAINT "ImportError_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
