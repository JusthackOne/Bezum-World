export const civilizationRoutes = {
  current: "/civilization",
  history: "/civilization/history",
  historyDetails: (gameId: string) => `/civilization/history/${encodeURIComponent(gameId)}`,
} as const;
