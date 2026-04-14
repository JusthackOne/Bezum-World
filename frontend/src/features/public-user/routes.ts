export const publicUserRoutes = {
  profile: (username: string) => `/users/${encodeURIComponent(username)}`,
} as const;
