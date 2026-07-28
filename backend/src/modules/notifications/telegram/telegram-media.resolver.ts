import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

export interface TelegramMediaUpload {
  blob: Blob;
  fileName: string;
}

export type TelegramMedia = string | TelegramMediaUpload;

@Injectable()
export class TelegramMediaResolver {
  private readonly logger = new Logger(TelegramMediaResolver.name);

  async resolve(image: string | null): Promise<TelegramMedia | null> {
    if (!image) {
      return null;
    }

    if (image.startsWith('https://') || image.startsWith('http://')) {
      return image;
    }

    if (!image.startsWith('/uploads/')) {
      this.logger.warn('Skipping Telegram image with unsupported location');
      return null;
    }

    const uploadsRoot = resolve(process.cwd(), 'uploads');
    const filePath = resolve(process.cwd(), image.replace(/^\//, ''));
    const relativePath = relative(uploadsRoot, filePath);

    if (relativePath.startsWith(`..${sep}`) || relativePath === '..' || isAbsolute(relativePath)) {
      this.logger.warn('Skipping Telegram image outside uploads directory');
      return null;
    }

    try {
      const content = await readFile(filePath);

      return {
        blob: new Blob([new Uint8Array(content)], { type: this.mimeType(filePath) }),
        fileName: relativePath.split(sep).at(-1) ?? 'image',
      };
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
      this.logger.warn(`Telegram image could not be read${errorCode ? ` (${errorCode})` : ''}`);
      return null;
    }
  }

  private mimeType(filePath: string): string {
    switch (extname(filePath).toLowerCase()) {
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.gif':
        return 'image/gif';
      default:
        return 'image/jpeg';
    }
  }
}
