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
  createdAt: string;
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

export interface TaskSuggestionCreator {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface TaskSuggestion {
  id: string;
  type: ClientTaskType;
  title: string;
  description: string | null;
  image?: string | null;
  rewardMoney: number;
  rewardGameScore: number | null;
  rewardAttributes: ClientTaskRewardAttributes | null;
  requiresProofImage: boolean;
  submissionLimit: number | null;
  creator: TaskSuggestionCreator;
  voteCount: number;
  hasVoted: boolean;
  canVote: boolean;
  isOwner: boolean;
  createdAt: string;
}

export interface TaskSuggestionsResponse {
  items: TaskSuggestion[];
  hasSuggestedToday: boolean;
}

export interface CreateTaskSuggestionInput {
  type: ClientTaskType;
  title: string;
  description?: string;
  image?: string;
  imageFile?: File | null;
  rewardMoney: number;
  rewardGameScore?: number;
  rewardAttributes?: ClientTaskRewardAttributes;
  requiresProofImage: boolean;
  submissionLimit?: number;
}

export interface VoteTaskSuggestionInput {
  suggestionId: string;
}

export interface UpdateTaskSuggestionInput extends CreateTaskSuggestionInput {
  suggestionId: string;
}

export interface DeleteTaskSuggestionResponse {
  deletedSuggestionId: string;
}

export interface VoteTaskSuggestionResponse {
  suggestionId: string;
  voteCount: number;
  hasVoted: boolean;
}
