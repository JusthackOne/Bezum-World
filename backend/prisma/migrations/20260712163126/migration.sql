-- DropForeignKey
ALTER TABLE "boss_attacks" DROP CONSTRAINT "boss_attacks_boss_battle_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_attacks" DROP CONSTRAINT "boss_attacks_user_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_battle_audit_logs" DROP CONSTRAINT "boss_battle_audit_logs_boss_battle_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_battle_participants" DROP CONSTRAINT "boss_battle_participants_boss_battle_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_battle_participants" DROP CONSTRAINT "boss_battle_participants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_battle_results" DROP CONSTRAINT "boss_battle_results_boss_battle_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_battle_results" DROP CONSTRAINT "boss_battle_results_reward_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_battle_results" DROP CONSTRAINT "boss_battle_results_user_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_battle_rewards" DROP CONSTRAINT "boss_battle_rewards_boss_battle_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_reward_claims" DROP CONSTRAINT "boss_reward_claims_boss_battle_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_reward_claims" DROP CONSTRAINT "boss_reward_claims_boss_battle_result_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_reward_claims" DROP CONSTRAINT "boss_reward_claims_boss_battle_reward_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_reward_claims" DROP CONSTRAINT "boss_reward_claims_user_id_fkey";

-- DropForeignKey
ALTER TABLE "boss_reward_item_templates" DROP CONSTRAINT "boss_reward_item_templates_boss_battle_reward_id_fkey";

-- AddForeignKey
ALTER TABLE "boss_battle_rewards" ADD CONSTRAINT "boss_battle_rewards_boss_battle_id_fkey" FOREIGN KEY ("boss_battle_id") REFERENCES "boss_battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_reward_item_templates" ADD CONSTRAINT "boss_reward_item_templates_boss_battle_reward_id_fkey" FOREIGN KEY ("boss_battle_reward_id") REFERENCES "boss_battle_rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_attacks" ADD CONSTRAINT "boss_attacks_boss_battle_id_fkey" FOREIGN KEY ("boss_battle_id") REFERENCES "boss_battles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_attacks" ADD CONSTRAINT "boss_attacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_battle_participants" ADD CONSTRAINT "boss_battle_participants_boss_battle_id_fkey" FOREIGN KEY ("boss_battle_id") REFERENCES "boss_battles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_battle_participants" ADD CONSTRAINT "boss_battle_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_battle_results" ADD CONSTRAINT "boss_battle_results_boss_battle_id_fkey" FOREIGN KEY ("boss_battle_id") REFERENCES "boss_battles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_battle_results" ADD CONSTRAINT "boss_battle_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_battle_results" ADD CONSTRAINT "boss_battle_results_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "boss_battle_rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_reward_claims" ADD CONSTRAINT "boss_reward_claims_boss_battle_id_fkey" FOREIGN KEY ("boss_battle_id") REFERENCES "boss_battles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_reward_claims" ADD CONSTRAINT "boss_reward_claims_boss_battle_result_id_fkey" FOREIGN KEY ("boss_battle_result_id") REFERENCES "boss_battle_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_reward_claims" ADD CONSTRAINT "boss_reward_claims_boss_battle_reward_id_fkey" FOREIGN KEY ("boss_battle_reward_id") REFERENCES "boss_battle_rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_reward_claims" ADD CONSTRAINT "boss_reward_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_battle_audit_logs" ADD CONSTRAINT "boss_battle_audit_logs_boss_battle_id_fkey" FOREIGN KEY ("boss_battle_id") REFERENCES "boss_battles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
