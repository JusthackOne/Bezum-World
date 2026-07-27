ALTER TYPE "EquipmentSlotType" ADD VALUE 'ACCESSORY';

ALTER TABLE "UserEquipmentSlot"
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

DROP INDEX "UserEquipmentSlot_userId_slotType_key";

CREATE UNIQUE INDEX "UserEquipmentSlot_userId_slotType_position_key"
ON "UserEquipmentSlot"("userId", "slotType", "position");

ALTER TABLE "UserEquipmentSlot"
ADD CONSTRAINT "UserEquipmentSlot_position_check"
CHECK (
  ("slotType"::text = 'ACCESSORY' AND "position" BETWEEN 0 AND 3)
  OR
  ("slotType"::text <> 'ACCESSORY' AND "position" = 0)
);
