-- CreateEnum
CREATE TYPE "EquipmentSlotType" AS ENUM ('HELMET', 'ARMOR', 'PANTS', 'BOOTS', 'LEFT_HAND', 'RIGHT_HAND');

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "slotType" "EquipmentSlotType";
UPDATE "items" SET "slotType" = 'RIGHT_HAND' WHERE "slotType" IS NULL;
ALTER TABLE "items" ALTER COLUMN "slotType" SET NOT NULL;

-- CreateTable
CREATE TABLE "UserEquipmentSlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotType" "EquipmentSlotType" NOT NULL,
    "itemId" TEXT,

    CONSTRAINT "UserEquipmentSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEquipmentSlot_itemId_key" ON "UserEquipmentSlot"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEquipmentSlot_userId_slotType_key" ON "UserEquipmentSlot"("userId", "slotType");

-- AddForeignKey
ALTER TABLE "UserEquipmentSlot" ADD CONSTRAINT "UserEquipmentSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEquipmentSlot" ADD CONSTRAINT "UserEquipmentSlot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
