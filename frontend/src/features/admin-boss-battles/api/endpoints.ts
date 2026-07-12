export const adminBossBattlesEndpoints = {
  list: "/admin/boss-battles",
  create: "/admin/boss-battles",
  images: "/admin/boss-battles/images",
  detail: (id: string) => `/admin/boss-battles/${encodeURIComponent(id)}`,
  finish: (id: string) => `/admin/boss-battles/${encodeURIComponent(id)}/finish`,
};
