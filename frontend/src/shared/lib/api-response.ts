import { isRecord } from "@/shared/lib/type-guards";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/shared/types/backend-api-response";

export function isApiSuccessResponse<TData>(value: unknown): value is ApiSuccessResponse<TData> {
  return isRecord(value) && value.success === true && "data" in value;
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return isRecord(value) && value.success === false && "error" in value;
}

export function getErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!isApiErrorResponse(payload)) {
    return fallbackMessage;
  }

  return payload.error.message;
}
