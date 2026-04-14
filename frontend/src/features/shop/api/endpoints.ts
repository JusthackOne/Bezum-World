export const shopApi = {
  items: "/items",
  purchase: (itemId: string) => `/items/${encodeURIComponent(itemId)}/purchase`,
} as const;
