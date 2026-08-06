CREATE TYPE "CivilizationGameStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CivilizationCompletionReason" AS ENUM ('TOWN_HALL_CAPTURED', 'END_TIME_REACHED', 'ADMIN_FORCE_COMPLETED', 'ADMIN_CANCELLED');
CREATE TYPE "CivilizationTeamSide" AS ENUM ('TEAM_A', 'TEAM_B');
CREATE TYPE "CivilizationTerrainType" AS ENUM ('GROUND', 'MOUNTAIN');
CREATE TYPE "CivilizationBuildingType" AS ENUM ('TOWN_HALL', 'GOLD_BUILDING', 'ATTRIBUTE_BUILDING');
CREATE TYPE "CivilizationBuildingStatus" AS ENUM ('ACTIVE', 'CAPTURED');
CREATE TYPE "CivilizationTowerStatus" AS ENUM ('UNDER_CONSTRUCTION', 'ACTIVE', 'DESTROYED', 'CANCELLED');
CREATE TYPE "CivilizationActionType" AS ENUM ('MOVE', 'ATTACK_PLAYER', 'CONTRIBUTE_BUILDING_CAPTURE', 'START_TOWER_CONSTRUCTION', 'ATTACK_TOWER', 'REPAIR_TOWER', 'CONTRIBUTE_TOWN_HALL_CAPTURE', 'DEFEND_TOWN_HALL');
CREATE TYPE "CivilizationEventType" AS ENUM ('GAME_CREATED', 'GAME_SCHEDULED', 'GAME_STARTED', 'GAME_COMPLETED', 'GAME_CANCELLED', 'PLAYER_ASSIGNED', 'PLAYER_ADDED_AFTER_START', 'PLAYER_MOVED', 'TILE_CAPTURED', 'PLAYER_ATTACKED', 'PLAYER_DEFEATED', 'PLAYER_RESPAWNED', 'BUILDING_CAPTURE_STARTED', 'BUILDING_CAPTURE_PROGRESS', 'BUILDING_CAPTURED', 'GOLD_ACCRUED', 'ATTRIBUTE_ACCRUED', 'TOWER_CONSTRUCTION_STARTED', 'TOWER_CONSTRUCTION_CANCELLED', 'TOWER_COMPLETED', 'TOWER_DESTROYED', 'TOWER_REPAIRED', 'TOWN_HALL_CAPTURE_PROGRESS', 'TOWN_HALL_DEFENDED', 'TOWN_HALL_CAPTURED', 'TEAM_GOLD_SPENT', 'REWARDS_DISTRIBUTED', 'ADMIN_STATE_CORRECTION');
CREATE TYPE "CivilizationRewardResourceType" AS ENUM ('GOLD', 'ATTRIBUTE');
CREATE TYPE "CivilizationAdminActionType" AS ENUM ('GAME_CREATED', 'GAME_UPDATED', 'GAME_SCHEDULED', 'PLAYER_ASSIGNED', 'PLAYER_ADDED_AFTER_START', 'MAP_UPDATED', 'SETTINGS_UPDATED', 'GAME_CANCELLED', 'GAME_FORCE_COMPLETED', 'STATE_CORRECTED');
CREATE TYPE "CivilizationAttributeKey" AS ENUM ('strength', 'charisma', 'endurance', 'intelligence');
CREATE TYPE "CivilizationGameSnapshotType" AS ENUM ('STARTED', 'FINAL');

CREATE TABLE "civilization_games" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CivilizationGameStatus" NOT NULL DEFAULT 'DRAFT',
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "end_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "winner_team_id" TEXT,
    "completion_reason" "CivilizationCompletionReason",
    "settings_json" JSONB NOT NULL,
    "created_by_admin_id" TEXT NOT NULL,
    "state_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "civilization_games_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "civilization_games_period_check" CHECK ("start_at" < "end_at"),
    CONSTRAINT "civilization_games_state_version_check" CHECK ("state_version" >= 0),
    CONSTRAINT "civilization_games_completion_check" CHECK (
        (("status" IN ('COMPLETED', 'CANCELLED')) AND "completed_at" IS NOT NULL AND "completion_reason" IS NOT NULL)
        OR
        (("status" NOT IN ('COMPLETED', 'CANCELLED')) AND "completed_at" IS NULL AND "completion_reason" IS NULL AND "winner_team_id" IS NULL)
    ),
    CONSTRAINT "civilization_games_cancelled_winner_check" CHECK ("status" <> 'CANCELLED' OR "winner_team_id" IS NULL)
);

CREATE TABLE "civilization_teams" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "visual_identifier" TEXT,
    "side" "CivilizationTeamSide" NOT NULL,
    "town_hall_tile_id" TEXT,
    "final_score" DECIMAL(30,12),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "civilization_teams_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "civilization_teams_final_score_check" CHECK ("final_score" IS NULL OR "final_score" >= 0)
);

CREATE TABLE "civilization_tiles" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "q" INTEGER NOT NULL,
    "r" INTEGER NOT NULL,
    "terrain_type" "CivilizationTerrainType" NOT NULL DEFAULT 'GROUND',
    "owner_team_id" TEXT,
    "is_connected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "civilization_tiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "civilization_tiles_mountain_state_check" CHECK (
        "terrain_type" <> 'MOUNTAIN' OR ("owner_team_id" IS NULL AND "is_connected" = false)
    )
);

CREATE TABLE "civilization_game_players" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "initial_tile_id" TEXT NOT NULL,
    "spawn_tile_id" TEXT NOT NULL,
    "current_tile_id" TEXT NOT NULL,
    "action_point_units" INTEGER NOT NULL,
    "last_action_point_update_at" TIMESTAMPTZ(3) NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "civilization_game_players_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "civilization_game_players_action_points_check" CHECK ("action_point_units" >= 0)
);

CREATE TABLE "civilization_spawn_points" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "tile_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "civilization_spawn_points_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civilization_buildings" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "tile_id" TEXT NOT NULL,
    "building_type" "CivilizationBuildingType" NOT NULL,
    "attribute_key" "CivilizationAttributeKey",
    "owner_team_id" TEXT,
    "capture_team_id" TEXT,
    "capture_progress_units" INTEGER NOT NULL DEFAULT 0,
    "capture_required_units" INTEGER NOT NULL,
    "income_per_hour" DECIMAL(30,12) NOT NULL,
    "status" "CivilizationBuildingStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "civilization_buildings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "civilization_buildings_capture_check" CHECK (
        "capture_required_units" > 0
        AND "capture_progress_units" >= 0
        AND "capture_progress_units" < "capture_required_units"
        AND (("capture_progress_units" = 0 AND "capture_team_id" IS NULL) OR ("capture_progress_units" > 0 AND "capture_team_id" IS NOT NULL))
    ),
    CONSTRAINT "civilization_buildings_income_check" CHECK ("income_per_hour" >= 0),
    CONSTRAINT "civilization_buildings_attribute_check" CHECK (
        ("building_type" = 'ATTRIBUTE_BUILDING' AND "attribute_key" IS NOT NULL)
        OR ("building_type" <> 'ATTRIBUTE_BUILDING' AND "attribute_key" IS NULL)
    ),
    CONSTRAINT "civilization_buildings_town_hall_income_check" CHECK ("building_type" <> 'TOWN_HALL' OR "income_per_hour" = 0)
);

CREATE TABLE "civilization_towers" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "tile_id" TEXT NOT NULL,
    "status" "CivilizationTowerStatus" NOT NULL DEFAULT 'UNDER_CONSTRUCTION',
    "protection_radius" INTEGER NOT NULL,
    "construction_started_at" TIMESTAMPTZ(3) NOT NULL,
    "construction_completes_at" TIMESTAMPTZ(3),
    "destroyed_at" TIMESTAMPTZ(3),
    "created_by_player_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "civilization_towers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "civilization_towers_radius_check" CHECK ("protection_radius" >= 0),
    CONSTRAINT "civilization_towers_construction_period_check" CHECK (
        "construction_completes_at" IS NULL OR "construction_completes_at" >= "construction_started_at"
    ),
    CONSTRAINT "civilization_towers_status_timestamps_check" CHECK (
        ("status" = 'UNDER_CONSTRUCTION' AND "construction_completes_at" IS NOT NULL AND "destroyed_at" IS NULL)
        OR ("status" = 'ACTIVE' AND "destroyed_at" IS NULL)
        OR ("status" = 'DESTROYED' AND "destroyed_at" IS NOT NULL)
        OR ("status" = 'CANCELLED')
    )
);

CREATE TABLE "civilization_team_resources" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "gold_amount" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "gold_income_per_hour" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "last_settled_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "civilization_team_resources_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "civilization_team_resources_non_negative_check" CHECK ("gold_amount" >= 0 AND "gold_income_per_hour" >= 0)
);

CREATE TABLE "civilization_team_attribute_resources" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "attribute_key" "CivilizationAttributeKey" NOT NULL,
    "amount" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "income_per_hour" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "last_settled_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "civilization_team_attribute_resources_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "civilization_team_attribute_resources_non_negative_check" CHECK ("amount" >= 0 AND "income_per_hour" >= 0)
);

CREATE TABLE "civilization_actions" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "action_type" "CivilizationActionType" NOT NULL,
    "request_payload" JSONB NOT NULL,
    "result_payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "civilization_actions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "civilization_actions_idempotency_key_check" CHECK (length(btrim("idempotency_key")) > 0)
);

CREATE TABLE "civilization_events" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "team_id" TEXT,
    "actor_player_id" TEXT,
    "target_player_id" TEXT,
    "tile_id" TEXT,
    "event_type" "CivilizationEventType" NOT NULL,
    "payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "civilization_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civilization_reward_distributions" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "resource_type" "CivilizationRewardResourceType" NOT NULL,
    "attribute_key" "CivilizationAttributeKey",
    "amount" INTEGER NOT NULL,
    "rounding_details" JSONB NOT NULL,
    "applied_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "civilization_reward_distributions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "civilization_reward_distributions_amount_check" CHECK ("amount" >= 0),
    CONSTRAINT "civilization_reward_distributions_resource_check" CHECK (
        ("resource_type" = 'GOLD' AND "attribute_key" IS NULL)
        OR ("resource_type" = 'ATTRIBUTE' AND "attribute_key" IS NOT NULL)
    )
);

CREATE TABLE "civilization_admin_audit_logs" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" "CivilizationAdminActionType" NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "civilization_admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civilization_game_snapshots" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "snapshot_type" "CivilizationGameSnapshotType" NOT NULL,
    "state_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "civilization_game_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "civilization_games_single_active_idx" ON "civilization_games" ((1)) WHERE "status" = 'ACTIVE';
CREATE INDEX "civilization_games_status_start_at_idx" ON "civilization_games"("status", "start_at");
CREATE INDEX "civilization_games_status_end_at_idx" ON "civilization_games"("status", "end_at");
CREATE INDEX "civilization_games_created_at_idx" ON "civilization_games"("created_at" DESC);

ALTER TABLE "civilization_games" ADD CONSTRAINT "civilization_games_non_overlapping_periods_excl"
EXCLUDE USING GIST (tstzrange("start_at", "end_at", '[)') WITH &&)
WHERE ("status" IN ('SCHEDULED', 'ACTIVE'));

CREATE UNIQUE INDEX "civilization_teams_town_hall_tile_id_key" ON "civilization_teams"("town_hall_tile_id");
CREATE UNIQUE INDEX "civilization_teams_game_id_side_key" ON "civilization_teams"("game_id", "side");
CREATE INDEX "civilization_teams_game_id_idx" ON "civilization_teams"("game_id");

CREATE UNIQUE INDEX "civilization_tiles_game_id_q_r_key" ON "civilization_tiles"("game_id", "q", "r");
CREATE INDEX "civilization_tiles_game_id_owner_team_id_idx" ON "civilization_tiles"("game_id", "owner_team_id");
CREATE INDEX "civilization_tiles_game_id_is_connected_idx" ON "civilization_tiles"("game_id", "is_connected");
CREATE INDEX "civilization_tiles_game_id_terrain_type_idx" ON "civilization_tiles"("game_id", "terrain_type");

CREATE UNIQUE INDEX "civilization_game_players_game_id_user_id_key" ON "civilization_game_players"("game_id", "user_id");
CREATE INDEX "civilization_game_players_game_id_team_id_is_active_idx" ON "civilization_game_players"("game_id", "team_id", "is_active");
CREATE INDEX "civilization_game_players_game_id_current_tile_id_idx" ON "civilization_game_players"("game_id", "current_tile_id");
CREATE INDEX "civilization_game_players_user_id_created_at_idx" ON "civilization_game_players"("user_id", "created_at" DESC);

CREATE UNIQUE INDEX "civilization_spawn_points_tile_id_key" ON "civilization_spawn_points"("tile_id");
CREATE UNIQUE INDEX "civilization_spawn_points_game_id_team_id_tile_id_key" ON "civilization_spawn_points"("game_id", "team_id", "tile_id");
CREATE INDEX "civilization_spawn_points_game_id_team_id_idx" ON "civilization_spawn_points"("game_id", "team_id");

CREATE UNIQUE INDEX "civilization_buildings_tile_id_key" ON "civilization_buildings"("tile_id");
CREATE INDEX "civilization_buildings_game_id_building_type_idx" ON "civilization_buildings"("game_id", "building_type");
CREATE INDEX "civilization_buildings_game_id_owner_team_id_idx" ON "civilization_buildings"("game_id", "owner_team_id");
CREATE INDEX "civilization_buildings_game_id_capture_team_id_idx" ON "civilization_buildings"("game_id", "capture_team_id");

CREATE INDEX "civilization_towers_game_id_team_id_status_idx" ON "civilization_towers"("game_id", "team_id", "status");
CREATE INDEX "civilization_towers_game_id_tile_id_status_idx" ON "civilization_towers"("game_id", "tile_id", "status");
CREATE INDEX "civilization_towers_status_construction_completes_at_idx" ON "civilization_towers"("status", "construction_completes_at");
CREATE UNIQUE INDEX "civilization_towers_occupied_tile_key" ON "civilization_towers"("game_id", "tile_id") WHERE "status" IN ('UNDER_CONSTRUCTION', 'ACTIVE', 'DESTROYED');

CREATE UNIQUE INDEX "civilization_team_resources_game_id_team_id_key" ON "civilization_team_resources"("game_id", "team_id");
CREATE INDEX "civilization_team_resources_team_id_idx" ON "civilization_team_resources"("team_id");
CREATE UNIQUE INDEX "civilization_team_attribute_resources_game_id_team_id_attribute_key_key" ON "civilization_team_attribute_resources"("game_id", "team_id", "attribute_key");
CREATE INDEX "civilization_team_attribute_resources_team_id_attribute_key_idx" ON "civilization_team_attribute_resources"("team_id", "attribute_key");

CREATE UNIQUE INDEX "civilization_actions_game_id_player_id_idempotency_key_key" ON "civilization_actions"("game_id", "player_id", "idempotency_key");
CREATE INDEX "civilization_actions_game_id_created_at_idx" ON "civilization_actions"("game_id", "created_at" DESC);
CREATE INDEX "civilization_actions_player_id_created_at_idx" ON "civilization_actions"("player_id", "created_at" DESC);

CREATE INDEX "civilization_events_game_id_created_at_id_idx" ON "civilization_events"("game_id", "created_at" DESC, "id");
CREATE INDEX "civilization_events_game_id_event_type_created_at_idx" ON "civilization_events"("game_id", "event_type", "created_at" DESC);
CREATE INDEX "civilization_events_actor_player_id_created_at_idx" ON "civilization_events"("actor_player_id", "created_at" DESC);

CREATE UNIQUE INDEX "civilization_reward_distributions_gold_key" ON "civilization_reward_distributions"("game_id", "team_id", "player_id") WHERE "resource_type" = 'GOLD';
CREATE UNIQUE INDEX "civilization_reward_distributions_attribute_key" ON "civilization_reward_distributions"("game_id", "team_id", "player_id", "attribute_key") WHERE "resource_type" = 'ATTRIBUTE';
CREATE INDEX "civilization_reward_distributions_game_id_team_id_idx" ON "civilization_reward_distributions"("game_id", "team_id");
CREATE INDEX "civilization_reward_distributions_player_id_applied_at_idx" ON "civilization_reward_distributions"("player_id", "applied_at");

CREATE INDEX "civilization_admin_audit_logs_game_id_created_at_idx" ON "civilization_admin_audit_logs"("game_id", "created_at" DESC);
CREATE INDEX "civilization_admin_audit_logs_admin_id_created_at_idx" ON "civilization_admin_audit_logs"("admin_id", "created_at" DESC);
CREATE UNIQUE INDEX "civilization_game_snapshots_game_id_snapshot_type_key" ON "civilization_game_snapshots"("game_id", "snapshot_type");
CREATE INDEX "civilization_game_snapshots_game_id_created_at_idx" ON "civilization_game_snapshots"("game_id", "created_at" DESC);

ALTER TABLE "civilization_games" ADD CONSTRAINT "civilization_games_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_games" ADD CONSTRAINT "civilization_games_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "civilization_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civilization_teams" ADD CONSTRAINT "civilization_teams_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_teams" ADD CONSTRAINT "civilization_teams_town_hall_tile_id_fkey" FOREIGN KEY ("town_hall_tile_id") REFERENCES "civilization_tiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civilization_tiles" ADD CONSTRAINT "civilization_tiles_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_tiles" ADD CONSTRAINT "civilization_tiles_owner_team_id_fkey" FOREIGN KEY ("owner_team_id") REFERENCES "civilization_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civilization_game_players" ADD CONSTRAINT "civilization_game_players_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_game_players" ADD CONSTRAINT "civilization_game_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "civilization_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_game_players" ADD CONSTRAINT "civilization_game_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_game_players" ADD CONSTRAINT "civilization_game_players_initial_tile_id_fkey" FOREIGN KEY ("initial_tile_id") REFERENCES "civilization_tiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_game_players" ADD CONSTRAINT "civilization_game_players_spawn_tile_id_fkey" FOREIGN KEY ("spawn_tile_id") REFERENCES "civilization_tiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_game_players" ADD CONSTRAINT "civilization_game_players_current_tile_id_fkey" FOREIGN KEY ("current_tile_id") REFERENCES "civilization_tiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_spawn_points" ADD CONSTRAINT "civilization_spawn_points_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_spawn_points" ADD CONSTRAINT "civilization_spawn_points_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "civilization_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_spawn_points" ADD CONSTRAINT "civilization_spawn_points_tile_id_fkey" FOREIGN KEY ("tile_id") REFERENCES "civilization_tiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_buildings" ADD CONSTRAINT "civilization_buildings_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_buildings" ADD CONSTRAINT "civilization_buildings_tile_id_fkey" FOREIGN KEY ("tile_id") REFERENCES "civilization_tiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_buildings" ADD CONSTRAINT "civilization_buildings_owner_team_id_fkey" FOREIGN KEY ("owner_team_id") REFERENCES "civilization_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civilization_buildings" ADD CONSTRAINT "civilization_buildings_capture_team_id_fkey" FOREIGN KEY ("capture_team_id") REFERENCES "civilization_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civilization_towers" ADD CONSTRAINT "civilization_towers_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_towers" ADD CONSTRAINT "civilization_towers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "civilization_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_towers" ADD CONSTRAINT "civilization_towers_tile_id_fkey" FOREIGN KEY ("tile_id") REFERENCES "civilization_tiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_towers" ADD CONSTRAINT "civilization_towers_created_by_player_id_fkey" FOREIGN KEY ("created_by_player_id") REFERENCES "civilization_game_players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civilization_team_resources" ADD CONSTRAINT "civilization_team_resources_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_team_resources" ADD CONSTRAINT "civilization_team_resources_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "civilization_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_team_attribute_resources" ADD CONSTRAINT "civilization_team_attribute_resources_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_team_attribute_resources" ADD CONSTRAINT "civilization_team_attribute_resources_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "civilization_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civilization_actions" ADD CONSTRAINT "civilization_actions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_actions" ADD CONSTRAINT "civilization_actions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "civilization_game_players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_events" ADD CONSTRAINT "civilization_events_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_events" ADD CONSTRAINT "civilization_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "civilization_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civilization_events" ADD CONSTRAINT "civilization_events_actor_player_id_fkey" FOREIGN KEY ("actor_player_id") REFERENCES "civilization_game_players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civilization_events" ADD CONSTRAINT "civilization_events_target_player_id_fkey" FOREIGN KEY ("target_player_id") REFERENCES "civilization_game_players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civilization_events" ADD CONSTRAINT "civilization_events_tile_id_fkey" FOREIGN KEY ("tile_id") REFERENCES "civilization_tiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civilization_reward_distributions" ADD CONSTRAINT "civilization_reward_distributions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_reward_distributions" ADD CONSTRAINT "civilization_reward_distributions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "civilization_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_reward_distributions" ADD CONSTRAINT "civilization_reward_distributions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "civilization_game_players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_admin_audit_logs" ADD CONSTRAINT "civilization_admin_audit_logs_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_admin_audit_logs" ADD CONSTRAINT "civilization_admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civilization_game_snapshots" ADD CONSTRAINT "civilization_game_snapshots_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "civilization_reject_append_only_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Rows in % are append-only', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER "civilization_events_append_only"
BEFORE UPDATE OR DELETE ON "civilization_events"
FOR EACH ROW EXECUTE FUNCTION "civilization_reject_append_only_mutation"();

CREATE TRIGGER "civilization_snapshots_append_only"
BEFORE UPDATE OR DELETE ON "civilization_game_snapshots"
FOR EACH ROW EXECUTE FUNCTION "civilization_reject_append_only_mutation"();
