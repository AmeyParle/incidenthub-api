-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "systemPrompt" TEXT NOT NULL,
    "userTemplate" TEXT NOT NULL,
    "modelId" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "maxTokens" INTEGER NOT NULL DEFAULT 512,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMLog" (
    "id" SERIAL NOT NULL,
    "promptVersionId" INTEGER NOT NULL,
    "ticketId" INTEGER,
    "inputSnapshot" TEXT NOT NULL,
    "rawOutput" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "scoreRelevance" DOUBLE PRECISION,
    "scoreCoherence" DOUBLE PRECISION,
    "scoreLengthOk" DOUBLE PRECISION,
    "scoreOverall" DOUBLE PRECISION,
    "evalStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LLMLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptVersion_name_isActive_idx" ON "PromptVersion"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_name_version_key" ON "PromptVersion"("name", "version");

-- CreateIndex
CREATE INDEX "LLMLog_promptVersionId_idx" ON "LLMLog"("promptVersionId");

-- CreateIndex
CREATE INDEX "LLMLog_ticketId_idx" ON "LLMLog"("ticketId");

-- CreateIndex
CREATE INDEX "LLMLog_evalStatus_idx" ON "LLMLog"("evalStatus");

-- AddForeignKey
ALTER TABLE "LLMLog" ADD CONSTRAINT "LLMLog_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
