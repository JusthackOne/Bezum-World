const gameBase = (gameId: string): string => `/civilization/games/${encodeURIComponent(gameId)}`;

export const civilizationEndpoints = {
  current: "/civilization/current",
  history: "/civilization/history",
  state: (gameId: string) => gameBase(gameId),
  move: (gameId: string) => `${gameBase(gameId)}/actions/move`,
  attackPlayer: (gameId: string) => `${gameBase(gameId)}/actions/attack-player`,
  captureBuilding: (gameId: string) => `${gameBase(gameId)}/actions/capture-building`,
  buildTower: (gameId: string) => `${gameBase(gameId)}/actions/build-tower`,
  attackTower: (gameId: string) => `${gameBase(gameId)}/actions/attack-tower`,
  catapultAttack: (gameId: string) => `${gameBase(gameId)}/actions/catapult-attack`,
  repairTower: (gameId: string) => `${gameBase(gameId)}/actions/repair-tower`,
  captureTownHall: (gameId: string) => `${gameBase(gameId)}/actions/capture-town-hall`,
  defendTownHall: (gameId: string) => `${gameBase(gameId)}/actions/defend-town-hall`,
  claimReward: (gameId: string) => `${gameBase(gameId)}/reward/claim`,
} as const;
