-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('unterlyanskiy', 'basic_minimum', 'sigma', 'bezumnyy');

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "strength" INTEGER,
    "charisma" INTEGER,
    "agility" INTEGER,
    "intelligence" INTEGER,
    "price" INTEGER NOT NULL,
    "rarity" "ItemRarity" NOT NULL,
    "durability" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "items_owner_user_id_idx" ON "items"("owner_user_id");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "items"
ADD CONSTRAINT "items_strength_range_check" CHECK ("strength" IS NULL OR ("strength" >= 0 AND "strength" <= 100)),
ADD CONSTRAINT "items_charisma_range_check" CHECK ("charisma" IS NULL OR ("charisma" >= 0 AND "charisma" <= 100)),
ADD CONSTRAINT "items_agility_range_check" CHECK ("agility" IS NULL OR ("agility" >= 0 AND "agility" <= 100)),
ADD CONSTRAINT "items_intelligence_range_check" CHECK ("intelligence" IS NULL OR ("intelligence" >= 0 AND "intelligence" <= 100)),
ADD CONSTRAINT "items_price_range_check" CHECK ("price" >= 0 AND "price" <= 1000),
ADD CONSTRAINT "items_durability_range_check" CHECK ("durability" IS NULL OR ("durability" >= 0 AND "durability" <= 100));