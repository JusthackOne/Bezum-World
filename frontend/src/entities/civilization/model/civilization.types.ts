import type { CivilizationAttributeKey } from "./civilization-assets";

export type CivilizationGameStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type CivilizationTeamSide = "TEAM_A" | "TEAM_B";
export type CivilizationTerrainType = "GROUND" | "MOUNTAIN";
export type CivilizationBuildingType = "TOWN_HALL" | "GOLD_BUILDING" | "ATTRIBUTE_BUILDING";
export type CivilizationBuildingStatus = "ACTIVE" | "CAPTURED";
export type CivilizationTowerStatus = "UNDER_CONSTRUCTION" | "ACTIVE" | "DESTROYED" | "CANCELLED";
export type CivilizationTowerWorkKind = "BUILD" | "REPAIR";

export type CivilizationActionType =
  | "MOVE"
  | "ATTACK_PLAYER"
  | "CAPTURE_BUILDING"
  | "BUILD_TOWER"
  | "ATTACK_TOWER"
  | "REPAIR_TOWER"
  | "CAPTURE_TOWN_HALL"
  | "DEFEND_TOWN_HALL"
  | "CATAPULT_ATTACK";

export interface HexCoordinate {
  q: number;
  r: number;
}

export interface CivilizationAttributeAmounts {
  strength: string;
  charisma: string;
  endurance: string;
  intelligence: string;
}

export interface CivilizationSettings {
  actionPoints: {
    maximumUnits: number;
    initialUnits: number;
    regenerationUnits: number;
    regenerationIntervalMinutes: number;
  };
  costs: {
    ownedMoveUnits: number;
    otherMoveUnits: number;
    attackPlayerUnits: number;
    buildingCaptureUnits: number;
    towerBuildUnits: number;
    towerAttackUnits: number;
    townHallCaptureUnits: number;
    townHallDefenseUnits: number;
    towerRepairUnits: number;
  };
  territoryGoldPerHour: string;
  goldBuildingIncomePerHour: string;
  attributeBuildingIncomePerHour: CivilizationAttributeAmounts;
  buildingCapture: {
    requiredUnits: number;
    contributionUnits: number;
  };
  combat: {
    attackerWinPercent: number;
    defenderWinPercent: number;
  };
  tower: {
    buildGoldCost: string;
    constructionMinutes: number;
    repairMinutes: number;
    protectionRadius: number;
    repairGoldCost: string;
    destructionRequiredActions: number;
  };
  catapult: {
    enabled: boolean;
    goldPrice: string;
    actionPointUnits: number;
    damage: number;
  };
  repairKit: {
    enabled: boolean;
    goldPrice: string;
    repairActions: number;
  };
  townHall: {
    captureRequiredUnits: number;
    contributionUnits: number;
    defenseReductionUnits: number;
    defenseGoldCost: string;
  };
  scoreWeights: {
    gold: string;
    strength: string;
    charisma: string;
    endurance: string;
    intelligence: string;
  };
  winnerBonus: string;
}

export interface CivilizationTeamSummary {
  id: string;
  side: CivilizationTeamSide;
  name: string;
  color: string;
  visualKey: string;
  playerCount: number;
  finalScore: string | null;
  finalGold: string | null;
  finalAttributes: CivilizationAttributeAmounts | null;
}

export interface CivilizationGameSummary {
  id: string;
  name: string;
  status: CivilizationGameStatus;
  startAt: string;
  endAt: string;
  completedAt: string | null;
  completionReason: string | null;
  winnerTeamId: string | null;
  winnerTeam: Pick<CivilizationTeamSummary, "id" | "name" | "color"> | null;
  teams: CivilizationTeamSummary[];
  playerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CivilizationTile {
  id: string;
  coordinate: HexCoordinate;
  terrainType: CivilizationTerrainType;
  ownerTeamId: string | null;
  isConnected: boolean;
}

export interface CivilizationSpawnPoint {
  id: string;
  teamId: string;
  tileId: string;
}

export interface CivilizationBuilding {
  id: string;
  tileId: string;
  type: CivilizationBuildingType;
  status: CivilizationBuildingStatus;
  attributeKey: CivilizationAttributeKey | null;
  ownerTeamId: string | null;
  capturingTeamId: string | null;
  captureProgress: number;
  captureRequired: number;
  incomePerHour: string;
}

export interface CivilizationTower {
  id: string;
  tileId: string;
  teamId: string;
  status: CivilizationTowerStatus;
  workKind: CivilizationTowerWorkKind | null;
  protectionRadius: number;
  destructionProgressActions: number;
  destructionRequiredActions: number;
  isConnected: boolean;
  constructionStartedAt: string;
  constructionCompletesAt: string | null;
  destroyedAt: string | null;
}

export interface CivilizationPlayerStatistics {
  actionsUsed: number;
  actionPointUnitsSpent: number;
  cellsCaptured: number;
  successfulPlayerAttacks: number;
  failedPlayerAttacks: number;
  buildingCaptureContributions: number;
  buildingCaptureContributionUnits: number;
  buildingsCaptured: number;
  towerConstructionsStarted: number;
  towersDestroyed: number;
  towersRepaired: number;
  townHallContributions: number;
  townHallContributionUnits: number;
  townHallDefenses: number;
  goldSpent: string;
}

export interface CivilizationPlayer {
  id: string;
  userId: string;
  teamId: string;
  username: string;
  avatarUrl: string | null;
  currentTileId: string;
  initialTileId: string;
  spawnTileId: string;
  actionPointUnits: number;
  maximumActionPointUnits: number;
  nextActionPointAt: string | null;
  joinedAt: string;
  isActive: boolean;
  statistics: CivilizationPlayerStatistics;
}

export interface CivilizationTeamState {
  id: string;
  side: CivilizationTeamSide;
  name: string;
  color: string;
  visualKey: string;
  townHallBuildingId: string;
  goldAmount: string;
  goldIncomePerHour: string;
  attributeAmounts: CivilizationAttributeAmounts;
  attributeIncomePerHour: CivilizationAttributeAmounts;
  ownedCellCount: number;
  connectedCellCount: number;
  disconnectedCellCount: number;
  controlledBuildingCount: number;
  activeTowerCount: number;
  townHallCaptureProgress: number;
  townHallCaptureRequired: number;
  estimatedScore: string;
  totalActionPointUnits: number;
}

export interface CivilizationLegalAction {
  type: CivilizationActionType;
  targetCoordinate?: HexCoordinate;
  targetPlayerId?: string;
  buildingId?: string;
  towerId?: string;
  actionPointUnits: number;
  goldCost: string;
  label: string;
  requiresConfirmation: boolean;
  disabledReason: string | null;
}

export interface CivilizationGameAccess {
  isParticipant: boolean;
  isSpectator: boolean;
  isReadOnly: boolean;
  currentPlayerId: string | null;
}

export interface CivilizationGameState {
  game: CivilizationGameSummary & { settings: CivilizationSettings };
  teams: CivilizationTeamState[];
  tiles: CivilizationTile[];
  spawnPoints: CivilizationSpawnPoint[];
  buildings: CivilizationBuilding[];
  towers: CivilizationTower[];
  players: CivilizationPlayer[];
  access: CivilizationGameAccess;
  availableActions: CivilizationLegalAction[];
  rewardClaim: {
    eligible: boolean;
    unavailableReason: string | null;
    reward: { gold: number; attributes: Record<CivilizationAttributeKey, number> };
    expiresAt: string | null;
    claimedAt: string | null;
  } | null;
  recentCatapultAttacks: Array<{
    id: string;
    actorPlayerId: string | null;
    tileId: string | null;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
  serverTime: string;
  stateVersion: number;
}

export interface CivilizationEvent {
  id: string;
  gameId: string;
  type: string;
  actorPlayerId: string | null;
  actor: {
    userId: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  targetPlayerId: string | null;
  target: {
    userId: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  tileId: string | null;
  teamId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface CivilizationPage<TItem> {
  items: TItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CivilizationActionResult {
  gameState: CivilizationGameState;
  event: CivilizationEvent;
}

export interface CivilizationAdminTeamInput {
  id?: string;
  side: CivilizationTeamSide;
  name: string;
  color: string;
  visualKey: string;
  playerIds: string[];
}

export interface CivilizationAdminTeamAInput extends CivilizationAdminTeamInput {
  side: "TEAM_A";
}

export interface CivilizationAdminTeamBInput extends CivilizationAdminTeamInput {
  side: "TEAM_B";
}

export interface CivilizationAdminTileInput extends HexCoordinate {
  terrainType: CivilizationTerrainType;
  ownerTeamSide: CivilizationTeamSide | null;
}

export type CivilizationAdminSpawnInput = HexCoordinate & { teamSide: CivilizationTeamSide };

export interface CivilizationAdminBuildingInput extends HexCoordinate {
  id?: string;
  type: CivilizationBuildingType;
  ownerTeamSide: CivilizationTeamSide | null;
  attributeKey: CivilizationAttributeKey | null;
  incomePerHour: string;
  captureRequiredUnits: number;
}

export interface CivilizationAdminTowerInput extends HexCoordinate {
  teamSide: CivilizationTeamSide;
  status: Exclude<CivilizationTowerStatus, "CANCELLED">;
  protectionRadius?: number;
  destructionRequiredActions?: number;
}

export interface CivilizationAdminMapInput {
  tiles: CivilizationAdminTileInput[];
  spawns: CivilizationAdminSpawnInput[];
  buildings: CivilizationAdminBuildingInput[];
  towers: CivilizationAdminTowerInput[];
}

export interface CivilizationAdminGameInput {
  name: string;
  startAt: string;
  endAt: string;
  teams: [CivilizationAdminTeamAInput, CivilizationAdminTeamBInput];
  map: CivilizationAdminMapInput;
  settings: CivilizationSettings;
}

export interface CivilizationAdminGame extends CivilizationGameSummary {
  settings: CivilizationSettings;
  teams: Array<CivilizationTeamSummary & { playerIds: string[] }>;
  map: CivilizationAdminMapInput;
  configurationErrors: CivilizationValidationIssue[];
}

export interface CivilizationValidationIssue {
  code: string;
  message: string;
  path: string | null;
  coordinate: HexCoordinate | null;
  severity: "ERROR" | "WARNING";
}

export interface CivilizationAdminAuditEntry {
  id: string;
  gameId: string;
  adminId: string;
  action: string;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AddCivilizationPlayerInput {
  userId: string;
  teamId: string;
}
