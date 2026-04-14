export const queryKeys = {
  authStatus: ["auth", "status"] as const,
  adminUsers: ["admin", "users"] as const,
  adminItems: (location: "all" | "shop" | "inventory") => ["admin", "items", location] as const,
  shopItems: ["shop", "items"] as const,
  userProfile: (username: string) => ["users", "profile", username] as const,
  publicUserProfile: (username: string) => ["users", "public-profile", username] as const,
  publicUserItems: (username: string) => ["users", "items", username] as const,
  userEquipment: (userId: string) => ["users", "equipment", userId] as const,
};
