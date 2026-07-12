export const bossBattleEndpoints = {
  current: "/boss-battles/current",
  history: "/boss-battles/history",
  details: (id: string) => `/boss-battles/${encodeURIComponent(id)}`,
  leaderboard: (id: string) => `/boss-battles/${encodeURIComponent(id)}/leaderboard`,
  attack: (id: string) => `/boss-battles/${encodeURIComponent(id)}/attacks`,
  claim: (id: string) => `/boss-battles/${encodeURIComponent(id)}/rewards/claim`,
};
