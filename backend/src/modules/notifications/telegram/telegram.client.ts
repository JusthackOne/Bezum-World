import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../../config/configuration';
import type { RenderedTelegramPost } from '../notification-template.renderer';
import { TelegramApiError } from './telegram-api.error';
import { TelegramMediaResolver, type TelegramMedia } from './telegram-media.resolver';

interface BunProxyRequestInit extends RequestInit {
  proxy?: string;
}

interface TelegramApiEnvelope {
  ok: boolean;
  result?: {
    message_id?: number;
  };
  error_code?: number;
  description?: string;
  parameters?: {
    retry_after?: number;
  };
}

@Injectable()
export class TelegramClient {
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly proxyUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(
    configService: ConfigService<AppConfig, true>,
    private readonly mediaResolver: TelegramMediaResolver,
  ) {
    const config = configService.get('telegram', { infer: true });
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.proxyUrl = config.proxyUrl;
    this.requestTimeoutMs = config.requestTimeoutMs;
  }

  async sendPost(post: RenderedTelegramPost): Promise<number[]> {
    const media = await this.mediaResolver.resolve(post.image);
    const messageIds: number[] = [];
    let firstMessageIndex = 0;

    if (media && post.messages[0]) {
      messageIds.push(await this.sendPhoto(media, post.messages[0]));
      firstMessageIndex = 1;
    }

    for (const message of post.messages.slice(firstMessageIndex)) {
      messageIds.push(await this.sendMessage(message));
    }

    return messageIds;
  }

  private sendMessage(text: string): Promise<number> {
    return this.call('sendMessage', {
      chat_id: this.chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  }

  private sendPhoto(media: TelegramMedia, caption: string): Promise<number> {
    const formData = new FormData();
    formData.append('chat_id', this.chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');

    if (typeof media === 'string') {
      formData.append('photo', media);
    } else {
      formData.append('photo', media.blob, media.fileName);
    }

    return this.call('sendPhoto', formData);
  }

  private async call(method: string, body: Record<string, unknown> | FormData): Promise<number> {
    const request: BunProxyRequestInit = {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...(body instanceof FormData
        ? {}
        : {
            headers: {
              'content-type': 'application/json',
            },
          }),
      signal: AbortSignal.timeout(this.requestTimeoutMs),
      proxy: this.proxyUrl,
    };

    let response: Response;

    try {
      response = await fetch(`https://api.telegram.org/bot${this.botToken}/${method}`, request);
    } catch (error) {
      const reason =
        error instanceof Error && error.name === 'TimeoutError' ? 'timed out' : 'failed';
      throw new TelegramApiError(`Telegram proxy request ${reason}`, 503);
    }

    const envelope = await this.parseEnvelope(response);

    if (!response.ok || !envelope.ok) {
      throw new TelegramApiError(
        envelope.description ?? `Telegram returned HTTP ${response.status}`,
        envelope.error_code ?? response.status,
        envelope.parameters?.retry_after,
      );
    }

    const messageId = envelope.result?.message_id;
    if (!Number.isInteger(messageId)) {
      throw new TelegramApiError('Telegram response does not contain message_id', 502);
    }

    return messageId as number;
  }

  private async parseEnvelope(response: Response): Promise<TelegramApiEnvelope> {
    let value: unknown;

    try {
      value = await response.json();
    } catch {
      throw new TelegramApiError('Telegram returned a non-JSON response', 502);
    }

    if (typeof value !== 'object' || value === null || !('ok' in value)) {
      throw new TelegramApiError('Telegram returned an invalid response', 502);
    }

    return value as TelegramApiEnvelope;
  }
}
