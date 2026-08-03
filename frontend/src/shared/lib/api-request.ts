import { isAxiosError, type AxiosResponse } from "axios";

import { getErrorMessage, isApiSuccessResponse } from "@/shared/lib/api-response";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

export class ApiRequestError extends Error {
  public readonly domainCode: string | null;
  public readonly statusCode: number | null;
  public readonly details: unknown;

  public constructor(
    message: string,
    options: { domainCode?: string | null; statusCode?: number | null; details?: unknown } = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.domainCode = options.domainCode ?? null;
    this.statusCode = options.statusCode ?? null;
    this.details = options.details;
  }
}

export function getApiRequestErrorMessage(
  error: unknown,
  fallbackMessage = "The request could not be completed.",
): string {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }
  if (error instanceof ApiRequestError && error.domainCode) {
    return `${error.message} (${error.domainCode})`;
  }
  return error.message;
}

export function getApiRequestErrorDetails(error: unknown): string[] {
  if (!(error instanceof ApiRequestError)) {
    return [];
  }
  const details = error.details;
  const entries = Array.isArray(details)
    ? details
    : details !== null &&
        typeof details === "object" &&
        "issues" in details &&
        Array.isArray((details as { issues?: unknown }).issues)
      ? ((details as { issues: unknown[] }).issues ?? [])
      : [];

  return entries.flatMap((entry) => {
    if (typeof entry === "string") {
      return [entry];
    }
    if (entry === null || typeof entry !== "object") {
      return [];
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.message !== "string") {
      return [];
    }
    const location = typeof record.path === "string" ? `${record.path}: ` : "";
    const code = typeof record.code === "string" ? ` (${record.code})` : "";
    return [`${location}${record.message}${code}`];
  });
}

export async function requestApiData<TData>(
  makeRequest: () => Promise<AxiosResponse<ApiSuccessResponse<TData>>>,
  fallbackErrorMessage: string,
): Promise<TData> {
  try {
    const response = await makeRequest();

    if (!isApiSuccessResponse<TData>(response.data)) {
      throw new Error("Unexpected server response");
    }

    return response.data.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      const payload = error.response?.data;
      const apiError =
        typeof payload === "object" && payload !== null && "success" in payload
          ? (payload as {
              success?: unknown;
              error?: { code?: unknown; statusCode?: unknown; details?: unknown };
            })
          : null;
      const code = apiError?.error?.code;
      const explicitStatusCode = apiError?.error?.statusCode;

      throw new ApiRequestError(getErrorMessage(payload, fallbackErrorMessage), {
        domainCode: typeof code === "string" ? code : null,
        statusCode:
          typeof explicitStatusCode === "number"
            ? explicitStatusCode
            : typeof code === "number"
              ? code
              : (error.response?.status ?? null),
        details: apiError?.error?.details,
      });
    }

    throw error;
  }
}
