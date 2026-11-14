/*
  Sync drift between prisma/migrations and schema.prisma.

  Features added to the schema but never captured by a migration:
  - User.passwordChangedAt (180-day password rotation policy)
  - Role enum value HEAD
  - PhaseNote table (catatan progres per fase SDLC)
  - Task.completedBy, Task.taskId unique constraint
  - TestCase soft-delete columns (isDeleted/deletedBy/deletedAt/takeoutReason/updatedBy)
  - Improvement.title
  - AuditLog_projectId_idx dropped (schema defines no explicit index)
*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'HEAD';

-- DropIndex
DROP INDEX "AuditLog_projectId_idx";

-- AlterTable
ALTER TABLE "Improvement" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completedBy" TEXT;

-- AlterTable
ALTER TABLE "TestCase" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "takeoutReason" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PhaseNote" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phaseId" INTEGER NOT NULL,
    CONSTRAINT "PhaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_taskId_key" ON "Task"("taskId");

-- AddForeignKey
ALTER TABLE "PhaseNote" ADD CONSTRAINT "PhaseNote_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "SDLCPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
