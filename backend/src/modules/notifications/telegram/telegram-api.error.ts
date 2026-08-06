export class TelegramApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = TelegramApiError.name;
  }

  get isRetryable(): boolean {
    return this.statusCode === 408 || this.statusCode === 429 || this.statusCode >= 500;
  }
}
