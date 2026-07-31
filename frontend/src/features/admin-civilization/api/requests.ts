import type {
  AddCivilizationPlayerInput,
  CivilizationAdminAuditEntry,
  CivilizationAdminGame,
  CivilizationAdminGameInput,
  CivilizationGameSummary,
  CivilizationGameState,
  CivilizationPage,
  CivilizationValidationIssue,
} from "@/entities/civilization";
import { requestApiData } from "@/shared/lib/api-request";
import { adminHttpClient } from "@/shared/lib/admin-http-client";

import { adminCivilizationEndpoints } from "./endpoints";

interface CivilizationAdminApiGame {
  id: string;
  name: string;
  status: CivilizationAdminGame["status"];
  startAt: string;
  endAt: string;
  completedAt: string | null;
  winnerTeamId: string | null;
  completionReason: string | null;
  teams: CivilizationAdminGameInput["teams"];
  map: CivilizationAdminGameInput["map"];
  settings: CivilizationAdminGameInput["settings"];
  playerCount: number;
  createdAt: string;
  updatedAt: string;
  gameState: CivilizationGameState;
}

function normalizeAdminGame(game: CivilizationAdminApiGame): CivilizationAdminGame {
  const summariesById = new Map(game.gameState.game.teams.map((team) => [team.id, team]));
  const teams = game.teams.map((team) => {
    const summary = team.id ? summariesById.get(team.id) : undefined;
    return {
      id: team.id ?? summary?.id ?? `${game.id}:${team.side}`,
      side: team.side,
      name: team.name,
      color: team.color,
      visualKey: team.visualKey,
      playerIds: team.playerIds,
      playerCount: summary?.playerCount ?? team.playerIds.length,
      finalScore: summary?.finalScore ?? null,
      finalGold: summary?.finalGold ?? null,
      finalAttributes: summary?.finalAttributes ?? null,
    };
  });
  const winner = game.winnerTeamId
    ? (teams.find((team) => team.id === game.winnerTeamId) ?? null)
    : null;
  return {
    id: game.id,
    name: game.name,
    status: game.status,
    startAt: game.startAt,
    endAt: game.endAt,
    completedAt: game.completedAt,
    completionReason: game.completionReason,
    winnerTeamId: game.winnerTeamId,
    winnerTeam: winner ? { id: winner.id, name: winner.name, color: winner.color } : null,
    teams,
    playerCount: game.playerCount,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    settings: game.settings,
    map: game.map,
    configurationErrors: [],
  };
}

export function getAdminCivilizationGames(
  page: number,
  limit: number,
  search: string,
  status?: CivilizationAdminGame["status"],
): Promise<CivilizationPage<CivilizationGameSummary>> {
  return requestApiData<CivilizationPage<CivilizationGameSummary>>(
    () =>
      adminHttpClient.get(adminCivilizationEndpoints.list, {
        params: { page, limit, search: search || undefined, status },
      }),
    "Unable to load Civilization games.",
  );
}

export function getAdminCivilizationGame(gameId: string): Promise<CivilizationAdminGame> {
  return requestApiData<CivilizationAdminApiGame>(
    () => adminHttpClient.get(adminCivilizationEndpoints.details(gameId)),
    "Unable to load the Civilization game.",
  ).then(normalizeAdminGame);
}

export function createAdminCivilizationGame(
  input: CivilizationAdminGameInput,
  idempotencyKey: string,
): Promise<CivilizationAdminGame> {
  return requestApiData<CivilizationAdminApiGame>(
    () =>
      adminHttpClient.post(adminCivilizationEndpoints.create, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    "Unable to create the Civilization game.",
  ).then(normalizeAdminGame);
}

export function updateAdminCivilizationGame(
  gameId: string,
  input: CivilizationAdminGameInput,
  idempotencyKey: string,
): Promise<CivilizationAdminGame> {
  return requestApiData<CivilizationAdminApiGame>(
    () =>
      adminHttpClient.patch(adminCivilizationEndpoints.details(gameId), input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    "Unable to update the Civilization game.",
  ).then(normalizeAdminGame);
}

export function validateAdminCivilizationGame(
  gameId: string,
): Promise<{ valid: boolean; issues: CivilizationValidationIssue[] }> {
  return requestApiData<{
    valid: boolean;
    issues: Array<{ code: string; message: string; path: string }>;
  }>(
    () => adminHttpClient.post(adminCivilizationEndpoints.validate(gameId)),
    "Unable to validate the Civilization configuration.",
  ).then((validation) => ({
    valid: validation.valid,
    issues: validation.issues.map((issue) => ({
      ...issue,
      coordinate: null,
      severity: "ERROR" as const,
    })),
  }));
}

export function scheduleAdminCivilizationGame(
  gameId: string,
  idempotencyKey: string,
): Promise<CivilizationAdminGame> {
  return requestApiData<CivilizationAdminApiGame>(
    () =>
      adminHttpClient.post(adminCivilizationEndpoints.schedule(gameId), undefined, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    "Unable to schedule the Civilization game.",
  ).then(normalizeAdminGame);
}

export function cancelAdminCivilizationGame(
  gameId: string,
  idempotencyKey: string,
): Promise<CivilizationAdminGame> {
  return requestApiData<CivilizationAdminApiGame>(
    () =>
      adminHttpClient.post(adminCivilizationEndpoints.cancel(gameId), undefined, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    "Unable to cancel the Civilization game.",
  ).then(normalizeAdminGame);
}

export function forceCompleteAdminCivilizationGame(
  gameId: string,
  idempotencyKey: string,
): Promise<CivilizationAdminGame> {
  return requestApiData<CivilizationAdminApiGame>(
    () =>
      adminHttpClient.post(
        adminCivilizationEndpoints.forceComplete(gameId),
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    "Unable to force-complete the Civilization game.",
  ).then(normalizeAdminGame);
}

export function addAdminCivilizationPlayer(
  gameId: string,
  input: AddCivilizationPlayerInput,
  idempotencyKey: string,
): Promise<CivilizationAdminGame> {
  return requestApiData<CivilizationAdminApiGame>(
    () =>
      adminHttpClient.post(adminCivilizationEndpoints.players(gameId), input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    "Unable to add the player to the active Civilization game.",
  ).then(normalizeAdminGame);
}

export function getAdminCivilizationAudit(
  gameId: string,
  page: number,
  limit: number,
): Promise<CivilizationPage<CivilizationAdminAuditEntry>> {
  return requestApiData(
    () =>
      adminHttpClient.get(adminCivilizationEndpoints.audit(gameId), {
        params: { page, limit },
      }),
    "Unable to load the Civilization audit log.",
  );
}
