export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
  meta: {
    timestamp: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
    details?: unknown;
  };
  meta: {
    path: string;
    method: string;
    timestamp: string;
  };
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;
