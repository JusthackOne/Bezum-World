"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";
import { queryKeys } from "@/shared/config/query-keys";
import type { BossBattle, BossBattleInput } from "../model/types";
import { adminBossBattlesEndpoints as e } from "./endpoints";
const getList = () =>
  requestApiData(
    () => adminHttpClient.get<ApiSuccessResponse<BossBattle[]>>(e.list),
    "Failed to load boss battles",
  );
const getOne = (id: string) =>
  requestApiData(
    () => adminHttpClient.get<ApiSuccessResponse<BossBattle>>(e.detail(id)),
    "Failed to load boss battle",
  );
export function useAdminBossBattlesQuery() {
  return useQuery({ queryKey: queryKeys.adminBossBattles, queryFn: getList });
}
export function useAdminBossBattleQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.adminBossBattleById(id),
    queryFn: () => getOne(id),
    enabled: Boolean(id),
  });
}
export function useSaveBossBattle(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BossBattleInput) =>
      requestApiData(
        () =>
          id
            ? adminHttpClient.patch<ApiSuccessResponse<BossBattle>>(e.detail(id), body)
            : adminHttpClient.post<ApiSuccessResponse<BossBattle>>(e.create, body),
        "Failed to save boss battle",
      ),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: queryKeys.adminBossBattles });
      qc.setQueryData(queryKeys.adminBossBattleById(data.id), data);
    },
  });
}
export function useFinishBossBattle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      requestApiData(
        () =>
          adminHttpClient.post<ApiSuccessResponse<BossBattle>>(e.finish(id), {
            confirm: true,
            grantRewards: false,
          }),
        "Failed to finish boss battle",
      ),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.adminBossBattles });
      await qc.invalidateQueries({ queryKey: queryKeys.adminBossBattleById(id) });
    },
  });
}
export async function uploadBossBattleImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("image", file, file.name);
  const result = await requestApiData(
    () => adminHttpClient.post<ApiSuccessResponse<{ imageUrl: string }>>(e.images, body),
    "Failed to upload image",
  );
  return result.imageUrl;
}
