export const queryKeys = {
  authStatus: ["auth", "status"] as const,
  adminUsers: ["admin", "users"] as const,
  adminItems: (location: "all" | "shop" | "inventory") => ["admin", "items", location] as const,
  userProfile: (username: string) => ["users", "profile", username] as const,
};
