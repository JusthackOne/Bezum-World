export type AdminTaskType = "daily" | "weekly" | "event";
export type AdminTaskTypeFilter = AdminTaskType | "all";

export interface AdminTaskRewardAttributes {
  strength?: number;
  intelligence?: number;
  charisma?: number;
  endurance?: number;
}

export interface AdminTask {
  id: string;
  type: AdminTaskType;
  title: string;
  description: string | null;
  image: string | null;
  rewardMoney: number;
  rewardGameScore: number | null;
  rewardAttributes: AdminTaskRewardAttributes | null;
  requiresProofImage: boolean;
  submissionLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTasksListResponse {
  items: AdminTask[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetAdminTasksInput {
  search?: string;
  type?: AdminTaskType;
  page?: number;
  limit?: number;
}

export interface CreateAdminTaskInput {
  type: AdminTaskType;
  title: string;
  description?: string;
  image?: string;
  imageFile?: File | null;
  rewardMoney: number;
  rewardGameScore?: number;
  rewardAttributes?: AdminTaskRewardAttributes;
  requiresProofImage: boolean;
  submissionLimit?: number;
}

export interface UpdateAdminTaskInput {
  taskId: string;
  type?: AdminTaskType;
  title?: string;
  description?: string;
  image?: string;
  imageFile?: File | null;
  rewardMoney?: number;
  rewardGameScore?: number;
  rewardAttributes?: AdminTaskRewardAttributes;
  requiresProofImage?: boolean;
  submissionLimit?: number;
}

export interface AdminDeleteTaskResponse {
  message: string;
  taskId: string;
}
