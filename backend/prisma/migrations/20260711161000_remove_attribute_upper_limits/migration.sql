-- Remove upper limits from user and item attributes while keeping non-negative checks.
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_strength_range_check";
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_charisma_range_check";
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_endurance_range_check";
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_intelligence_range_check";

ALTER TABLE "Account" ADD CONSTRAINT "Account_strength_non_negative_check" CHECK ("strength" >= 0);
ALTER TABLE "Account" ADD CONSTRAINT "Account_charisma_non_negative_check" CHECK ("charisma" >= 0);
ALTER TABLE "Account" ADD CONSTRAINT "Account_endurance_non_negative_check" CHECK ("endurance" >= 0);
ALTER TABLE "Account" ADD CONSTRAINT "Account_intelligence_non_negative_check" CHECK ("intelligence" >= 0);

ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_strength_range_check";
ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_charisma_range_check";
ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_agility_range_check";
ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_intelligence_range_check";

ALTER TABLE "items" ADD CONSTRAINT "items_strength_non_negative_check" CHECK ("strength" IS NULL OR "strength" >= 0);
ALTER TABLE "items" ADD CONSTRAINT "items_charisma_non_negative_check" CHECK ("charisma" IS NULL OR "charisma" >= 0);
ALTER TABLE "items" ADD CONSTRAINT "items_agility_non_negative_check" CHECK ("agility" IS NULL OR "agility" >= 0);
ALTER TABLE "items" ADD CONSTRAINT "items_intelligence_non_negative_check" CHECK ("intelligence" IS NULL OR "intelligence" >= 0);
