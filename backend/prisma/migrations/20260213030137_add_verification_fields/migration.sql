/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "verificationToken" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'OFFICER',
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";
