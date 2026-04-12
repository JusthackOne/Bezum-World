-- AlterTable
ALTER TABLE "Account"
ADD COLUMN "strength" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "charisma" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "endurance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "intelligence" INTEGER NOT NULL DEFAULT 0;

-- AddCheckConstraints
ALTER TABLE "Account"
ADD CONSTRAINT "Account_strength_range_check" CHECK ("strength" >= 0 AND "strength" <= 100),
ADD CONSTRAINT "Account_charisma_range_check" CHECK ("charisma" >= 0 AND "charisma" <= 100),
ADD CONSTRAINT "Account_endurance_range_check" CHECK ("endurance" >= 0 AND "endurance" <= 100),
ADD CONSTRAINT "Account_intelligence_range_check" CHECK ("intelligence" >= 0 AND "intelligence" <= 100);
