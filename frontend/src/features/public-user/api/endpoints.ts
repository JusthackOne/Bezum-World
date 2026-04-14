export const publicUserApi = {
  profile: (username: string) => `/users/${encodeURIComponent(username)}`,
  items: (username: string) => `/users/${encodeURIComponent(username)}/items`,
  equipment: (userId: string) => `/user/${encodeURIComponent(userId)}/equipment`,
  equip: (itemId: string) => `/user/equipment/${encodeURIComponent(itemId)}`,
} as const;
