export const battlesApi = {
  players: "/battles/players",
  startBattle: (opponentUserId: string) => `/battles/${opponentUserId}`,
};
