/*
  Warnings:

  - Added the required column `title` to the `Issue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SDLCPhase" ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'not-started';
