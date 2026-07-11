import type { ItemDisplay } from "@/shared/model/item-display.types";

export type EventFilter = "all" | "battles" | "purchases" | "tasks";

export interface EventUser {
  id: string;
  username: string;
  avatar: string | null;
}

export interface PurchaseGameEvent {
  id: string;
  type: "PURCHASE";
  created_at: string;
  user: EventUser;
  item: ItemDisplay;
}

export interface BattleGameEvent {
  id: string;
  type: "BATTLE";
  created_at: string;
  challenger: EventUser;
  opponent: EventUser;
  winner: EventUser;
  result: "WIN" | "LOSE";
  gameScoreReward: number;
  goldReward: number;
}

export interface CompletedTask {
  id: string;
  type: string;
  title: string;
  image: string | null;
  rewardMoney: number;
  rewardGameScore: number | null;
  rewardAttributes: {
    strength?: number;
    intelligence?: number;
    charisma?: number;
    endurance?: number;
  } | null;
}

export interface TaskCompletedGameEvent {
  id: string;
  type: "TASK_COMPLETED";
  created_at: string;
  user: EventUser;
  task: CompletedTask;
  submissionId: string;
  proofImage: string | null;
}

export type GameEvent = PurchaseGameEvent | BattleGameEvent | TaskCompletedGameEvent;

export interface EventsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EventsResponse {
  filter: EventFilter;
  events: GameEvent[];
  pagination: EventsPagination;
}
