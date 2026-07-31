export const queryKeys = {
  authStatus: ["auth", "status"] as const,
  adminUsers: ["admin", "users"] as const,
  adminItems: (location: "all" | "shop" | "inventory") => ["admin", "items", location] as const,
  adminTasks: (filters: {
    search: string;
    type: "all" | "daily" | "weekly" | "event";
    page: number;
    limit: number;
  }) => ["admin", "tasks", filters.search, filters.type, filters.page, filters.limit] as const,
  adminTaskById: (taskId: string) => ["admin", "tasks", "by-id", taskId] as const,
  adminBossBattles: ["admin", "boss-battles"] as const,
  adminBossBattleById: (id: string) => ["admin", "boss-battles", "by-id", id] as const,
  shopItemsPrefix: ["shop", "items"] as const,
  shopItems: (playerListingsOnly: boolean) =>
    ["shop", "items", playerListingsOnly ? "players" : "all"] as const,
  clientTasksPrefix: ["client", "tasks"] as const,
  clientTasks: (filters: { search: string; type: "all" | "daily" | "weekly" | "event" }) =>
    ["client", "tasks", filters.search, filters.type] as const,
  taskSuggestionsToday: ["client", "tasks", "suggestions", "today"] as const,
  leaderboard: (period: "all" | "weekly" | "daily") => ["leaderboard", period] as const,
  events: (filters: { type: "all" | "battles" | "purchases" | "tasks"; page: number }) =>
    ["events", filters.type, filters.page] as const,
  eventsPrefix: ["events"] as const,
  battlesPlayers: ["battles", "players"] as const,
  slotsConfig: ["slots", "config"] as const,
  slotsLeaderboardPrefix: ["slots", "leaderboard"] as const,
  slotsLeaderboard: (type: "winnings" | "losses") => ["slots", "leaderboard", type] as const,
  currentBossBattle: ["boss-battles", "current"] as const,
  bossBattleHistory: (page: number) => ["boss-battles", "history", page] as const,
  bossBattleById: (id: string) => ["boss-battles", "by-id", id] as const,
  bossLeaderboard: (battleId: string) => ["boss-battles", battleId, "leaderboard"] as const,
  userProfile: (username: string) => ["users", "profile", username] as const,
  publicUserProfile: (username: string) => ["users", "public-profile", username] as const,
  publicUserItems: (username: string) => ["users", "items", username] as const,
  userEquipment: (userId: string) => ["users", "equipment", userId] as const,
  civilizationCurrent: ["civilization", "current"] as const,
  civilizationState: (gameId: string) => ["civilization", "games", gameId, "state"] as const,
  civilizationHistory: (page: number, limit: number) =>
    ["civilization", "history", page, limit] as const,
  civilizationEvents: (gameId: string, page: number, limit: number) =>
    ["civilization", "games", gameId, "events", page, limit] as const,
  adminCivilizationGames: ["admin", "civilization", "games"] as const,
  adminCivilizationGamesPage: (page: number, limit: number, search: string, status?: string) =>
    ["admin", "civilization", "games", "page", page, limit, search, status ?? "ALL"] as const,
  adminCivilizationGame: (gameId: string) => ["admin", "civilization", "games", gameId] as const,
  adminCivilizationAudit: (gameId: string, page: number, limit: number) =>
    ["admin", "civilization", "games", gameId, "audit", page, limit] as const,
};
