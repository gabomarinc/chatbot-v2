-- CreateTable
CREATE TABLE "AgentMedia" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentMedia_agentId_idx" ON "AgentMedia"("agentId");

-- CreateIndex
CREATE INDEX "AgentMedia_tags_idx" ON "AgentMedia"("tags");

-- AddForeignKey
ALTER TABLE "AgentMedia" ADD CONSTRAINT "AgentMedia_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
