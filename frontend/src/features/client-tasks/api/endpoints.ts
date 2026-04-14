export const clientTasksEndpoints = {
  list: "/tasks",
  submit: (taskId: string) => `/tasks/${taskId}/submit`,
};
