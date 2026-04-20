export type LeaderboardPeriod = "all" | "weekly" | "daily";

export interface LeaderboardLeader {
  userId: string;
  username: string;
  avatar: string | null;
  totalGameScore: number;
  periodGameScore: number;
  rank: number;
  score: number;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  leaders: LeaderboardLeader[];
}
