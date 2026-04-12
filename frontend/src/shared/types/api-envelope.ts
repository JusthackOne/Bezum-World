export interface ApiEnvelope<TData> {
  success: boolean;
  data: TData;
  error: string | null;
}
