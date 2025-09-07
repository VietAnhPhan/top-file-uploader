/*
  Warnings:

  - The `size` column on the `File` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."File" DROP COLUMN "size",
ADD COLUMN     "size" INTEGER NOT NULL DEFAULT 0;
