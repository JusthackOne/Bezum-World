ALTER TABLE "boss_battles"
ADD COLUMN "default_damage" INTEGER NOT NULL DEFAULT 100;

ALTER TABLE "boss_battles"
ALTER COLUMN "default_damage" DROP DEFAULT;

ALTER TABLE "boss_battles"
ADD CONSTRAINT "boss_battle_default_damage_check"
CHECK (default_damage > 0 AND default_damage <= 858993458);

ALTER TABLE "boss_attacks"
DROP CONSTRAINT "boss_attack_random_check";

-- Keep the legacy lower bound for historical attacks created by the previous
-- 0.9-1.1 formula. New default-damage attacks are restricted in application code
-- to 1.0 for normal attacks and 1.0-2.5 for Super Attacks.
ALTER TABLE "boss_attacks"
ADD CONSTRAINT "boss_attack_random_check"
CHECK (random_multiplier >= 0.9 AND random_multiplier <= 2.5);
