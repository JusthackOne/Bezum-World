export const clientTasksEndpoints = {
  list: "/tasks",
  submit: (taskId: string) => `/tasks/${taskId}/submit`,
  suggestions: "/tasks/suggestions",
  todaySuggestions: "/tasks/suggestions/today",
  voteSuggestion: (suggestionId: string) =>
    `/tasks/suggestions/${encodeURIComponent(suggestionId)}/vote`,
  suggestion: (suggestionId: string) =>
    `/tasks/suggestions/${encodeURIComponent(suggestionId)}`,
};
