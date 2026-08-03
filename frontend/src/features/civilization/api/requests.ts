import type {
  CivilizationActionResult,
  CivilizationActionType,
  CivilizationGameState,
  CivilizationGameSummary,
  CivilizationPage,
  HexCoordinate,
} from "@/entities/civilization";
import { requestApiData } from "@/shared/lib/api-request";
import { clientHttpClient } from "@/shared/lib/client-http-client";

import { civilizationEndpoints } from "./endpoints";

export type CivilizationActionPayload =
  | { type: "MOVE"; actionId: string; target: HexCoordinate }
  | { type: "ATTACK_PLAYER"; actionId: string; targetPlayerId: string }
  | { type: "CAPTURE_BUILDING"; actionId: string; buildingId: string }
  | { type: "BUILD_TOWER"; actionId: string; tile: HexCoordinate }
  | { type: "ATTACK_TOWER"; actionId: string; towerId: string }
  | {
      type: "CATAPULT_ATTACK";
      actionId: string;
      towerId?: string;
      townHallBuildingId?: string;
    }
  | { type: "REPAIR_TOWER"; actionId: string; towerId: string }
  | { type: "CAPTURE_TOWN_HALL"; actionId: string; townHallBuildingId: string }
  | { type: "DEFEND_TOWN_HALL"; actionId: string; townHallBuildingId: string };

const actionEndpoints: Record<CivilizationActionType, (gameId: string) => string> = {
  MOVE: civilizationEndpoints.move,
  ATTACK_PLAYER: civilizationEndpoints.attackPlayer,
  CAPTURE_BUILDING: civilizationEndpoints.captureBuilding,
  BUILD_TOWER: civilizationEndpoints.buildTower,
  ATTACK_TOWER: civilizationEndpoints.attackTower,
  CATAPULT_ATTACK: civilizationEndpoints.catapultAttack,
  REPAIR_TOWER: civilizationEndpoints.repairTower,
  CAPTURE_TOWN_HALL: civilizationEndpoints.captureTownHall,
  DEFEND_TOWN_HALL: civilizationEndpoints.defendTownHall,
};

function withoutActionType(payload: CivilizationActionPayload): Record<string, unknown> {
  const body: Record<string, unknown> = { ...payload };
  delete body.type;
  return body;
}

export function getCurrentCivilizationGame(): Promise<CivilizationGameSummary | null> {
  return requestApiData(
    () => clientHttpClient.get(civilizationEndpoints.current),
    "Unable to load the current Civilization game.",
  );
}

export function getCivilizationGameState(gameId: string): Promise<CivilizationGameState> {
  return requestApiData(
    () => clientHttpClient.get(civilizationEndpoints.state(gameId)),
    "Unable to load the Civilization map.",
  );
}

export function getCivilizationHistory(
  page: number,
  limit: number,
): Promise<CivilizationPage<CivilizationGameSummary>> {
  return requestApiData(
    () => clientHttpClient.get(civilizationEndpoints.history, { params: { page, limit } }),
    "Unable to load Civilization history.",
  );
}

export function performCivilizationAction(
  gameId: string,
  payload: CivilizationActionPayload,
): Promise<CivilizationActionResult> {
  return requestApiData(
    () => clientHttpClient.post(actionEndpoints[payload.type](gameId), withoutActionType(payload)),
    "The Civilization action could not be completed.",
  );
}

export function claimCivilizationReward(
  gameId: string,
): Promise<{ status: "CLAIMED" | "ALREADY_CLAIMED"; claimedAt: string; reward: unknown }> {
  return requestApiData(
    () => clientHttpClient.post(civilizationEndpoints.claimReward(gameId)),
    "The Civilization reward could not be claimed.",
  );
}
