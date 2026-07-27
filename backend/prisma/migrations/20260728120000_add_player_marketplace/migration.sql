ALTER TABLE "items"
ADD COLUMN "is_listed_for_sale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "listing_price" INTEGER;

ALTER TABLE "items"
ADD CONSTRAINT "items_listing_price_non_negative"
CHECK ("listing_price" IS NULL OR "listing_price" >= 0);

CREATE INDEX "items_is_listed_for_sale_created_at_idx"
ON "items"("is_listed_for_sale", "created_at");
