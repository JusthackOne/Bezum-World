export const slotsEndpoints = {
  config: "/slots",
  spin: "/slots/spin",
  leaderboard: (type: "winnings" | "losses") =>
    `/slots/leaderboard?type=${encodeURIComponent(type)}`,
} as const;
