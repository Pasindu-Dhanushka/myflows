-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Workflow" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "definition" JSONB NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workflow_createdById_idx" ON "Workflow"("createdById");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_idx" ON "WorkflowRun"("workflowId");

-- AddForeignKey
ALTER TABLE "Workflow"
ADD CONSTRAINT "Workflow_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun"
ADD CONSTRAINT "WorkflowRun_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
