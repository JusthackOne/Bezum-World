export const bossBattleRoutes = {
  current: "/boss-battle",
  history: "/boss-battle/history",
  details: (id: string) => `/boss-battle/${encodeURIComponent(id)}`,
};
