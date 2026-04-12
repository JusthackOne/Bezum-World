-- AlterTable
ALTER TABLE "Account"
ADD COLUMN "balance" INTEGER NOT NULL DEFAULT 0;

-- AddCheckConstraint
ALTER TABLE "Account"
ADD CONSTRAINT "Account_balance_non_negative_check" CHECK ("balance" >= 0);