/*
  Warnings:

  - Added the required column `userName` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "userName" TEXT;

-- Backfill existing audit rows before enforcing the required column.
UPDATE "AuditLog" AS audit
SET "userName" = COALESCE("User"."name", 'Unknown')
FROM "User"
WHERE "User"."id" = audit."userId";

UPDATE "AuditLog"
SET "userName" = 'Unknown'
WHERE "userName" IS NULL;

ALTER TABLE "AuditLog" ALTER COLUMN "userName" SET NOT NULL;
