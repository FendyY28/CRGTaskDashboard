/*
  Warnings:

  - Added the required column `title` to the `WeeklyProgress` table without a default value.
    The column is created with DEFAULT '' so existing rows are backfilled and the
    migration can run on a non-empty table.
  - `description` is nullable, so existing rows stay valid without a backfill.

*/
-- AlterTable
ALTER TABLE "WeeklyProgress" ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "description" TEXT;
