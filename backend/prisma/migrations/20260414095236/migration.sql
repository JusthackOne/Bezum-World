/*
  Warnings:

  - You are about to drop the column `game_score` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "game_score",
ADD COLUMN     "gameScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "updated_at" DROP DEFAULT;
