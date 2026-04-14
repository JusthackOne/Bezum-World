export const publicUserApi = {
  profile: (username: string) => `/users/${encodeURIComponent(username)}`,
  items: (username: string) => `/users/${encodeURIComponent(username)}/items`,
} as const;
