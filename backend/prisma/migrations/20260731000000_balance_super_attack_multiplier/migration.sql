ALTER TABLE "boss_attacks"
DROP CONSTRAINT "boss_attack_random_check";

-- Keep the previous 2.5 upper bound so historical Super Attacks remain valid.
-- New Super Attacks are restricted to 0.8-1.8 by formula version 2 in application code.
ALTER TABLE "boss_attacks"
ADD CONSTRAINT "boss_attack_random_check"
CHECK (random_multiplier >= 0.8 AND random_multiplier <= 2.5);
