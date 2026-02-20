-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OFFICER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OFFICER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentPhase" TEXT NOT NULL,
    "overallProgress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "pic" TEXT NOT NULL,
    "projectStartDate" TIMESTAMP(3) NOT NULL,
    "projectDeadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cycle" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDLCPhase" (
    "id" SERIAL NOT NULL,
    "phaseName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "SDLCPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyProgress" (
    "id" SERIAL NOT NULL,
    "weekRange" TEXT NOT NULL,
    "progress" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "WeeklyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completedDate" TIMESTAMP(3),
    "weeklyProgressId" INTEGER NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Defect" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "testCaseId" TEXT NOT NULL,

    CONSTRAINT "Defect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" SERIAL NOT NULL,
    "issueId" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impactArea" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "reportedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'open',
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Improvement" (
    "id" SERIAL NOT NULL,
    "noteId" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "developer" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Improvement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Defect_testCaseId_key" ON "Defect"("testCaseId");

-- AddForeignKey
ALTER TABLE "SDLCPhase" ADD CONSTRAINT "SDLCPhase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyProgress" ADD CONSTRAINT "WeeklyProgress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_weeklyProgressId_fkey" FOREIGN KEY ("weeklyProgressId") REFERENCES "WeeklyProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Improvement" ADD CONSTRAINT "Improvement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
