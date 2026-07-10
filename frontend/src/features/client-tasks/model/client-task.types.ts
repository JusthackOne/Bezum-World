export type ClientTaskType = "daily" | "weekly" | "event";
export type ClientTaskTypeFilter = ClientTaskType | "all";

export interface ClientTaskRewardAttributes {
  strength?: number;
  intelligence?: number;
  charisma?: number;
  endurance?: number;
}

export interface ClientTask {
  id: string;
  type: ClientTaskType;
  title: string;
  description: string | null;
  image?: string | null;
  rewardMoney?: number | null;
  rewardGameScore?: number | null;
  rewardAttributes?: ClientTaskRewardAttributes | null;
  requiresProofImage: boolean;
  isAvailable: boolean;
}

export interface ClientTasksListResponse {
  items: ClientTask[];
}

export interface GetClientTasksInput {
  search?: string;
  type?: ClientTaskType;
}

export interface SubmitClientTaskInput {
  taskId: string;
  proofImage?: string;
  proofImageFile?: File;
}

export interface SubmitClientTaskResponse {
  submission: {
    id: string;
    taskId: string;
    userId: string;
    proofImage: string | null;
    createdAt: string;
  };
  user: {
    balance: number;
    gameScore: number;
    strength: number;
    intelligence: number;
    charisma: number;
    endurance: number;
  };
}
