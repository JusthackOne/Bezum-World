const details = (gameId: string): string => `/admin/civilization/${encodeURIComponent(gameId)}`;

export const adminCivilizationEndpoints = {
  list: "/admin/civilization",
  create: "/admin/civilization",
  details,
  validate: (gameId: string) => `${details(gameId)}/validate`,
  schedule: (gameId: string) => `${details(gameId)}/schedule`,
  cancel: (gameId: string) => `${details(gameId)}/cancel`,
  forceComplete: (gameId: string) => `${details(gameId)}/force-complete`,
  players: (gameId: string) => `${details(gameId)}/players`,
  audit: (gameId: string) => `${details(gameId)}/audit`,
} as const;
