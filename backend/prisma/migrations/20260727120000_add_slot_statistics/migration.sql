CREATE TABLE "slot_statistics" (
    "user_id" TEXT NOT NULL,
    "total_winnings" INTEGER NOT NULL DEFAULT 0,
    "total_losses" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_statistics_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "slot_statistics"
ADD CONSTRAINT "slot_statistics_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
