export const adminCivilizationRoutes = {
  list: "/admin/civilization",
  create: "/admin/civilization/create",
  details: (gameId: string) => `/admin/civilization/${encodeURIComponent(gameId)}`,
  edit: (gameId: string) => `/admin/civilization/${encodeURIComponent(gameId)}/edit`,
} as const;
