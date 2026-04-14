export const adminTasksEndpoints = {
  list: "/admin/tasks",
  byId: (taskId: string) => `/admin/tasks/${encodeURIComponent(taskId)}`,
} as const;
