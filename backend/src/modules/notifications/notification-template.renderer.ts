import { Injectable } from '@nestjs/common';
import { NotificationEventType, type NotificationOutbox } from '@prisma/client';

import {
  bossActivatedPayloadSchema,
  bossDefeatedPayloadSchema,
  dailyDigestPayloadSchema,
  taskSuggestedPayloadSchema,
} from './notification-event.schemas';

const TELEGRAM_MESSAGE_LIMIT = 4_096;
const TELEGRAM_CAPTION_LIMIT = 1_024;
const MESSAGE_CHUNK_TARGET = 3_900;

export interface RenderedTelegramPost {
  image: string | null;
  messages: string[];
}

@Injectable()
export class NotificationTemplateRenderer {
  render(outbox: Pick<NotificationOutbox, 'eventType' | 'payload'>): RenderedTelegramPost {
    switch (outbox.eventType) {
      case NotificationEventType.TASK_SUGGESTED:
        return this.renderTaskSuggested(taskSuggestedPayloadSchema.parse(outbox.payload));
      case NotificationEventType.BOSS_ACTIVATED:
        return this.renderBossActivated(bossActivatedPayloadSchema.parse(outbox.payload));
      case NotificationEventType.BOSS_DEFEATED:
        return this.renderBossDefeated(bossDefeatedPayloadSchema.parse(outbox.payload));
      case NotificationEventType.DAILY_DIGEST:
        return this.renderDailyDigest(dailyDigestPayloadSchema.parse(outbox.payload));
    }
  }

  private renderTaskSuggested(payload: ReturnType<typeof taskSuggestedPayloadSchema.parse>) {
    const lines = [
      '📝 <b>Новое предложение задания</b>',
      '',
      `🎯 <b>${this.escapeHtml(this.truncate(payload.title, 220))}</b>`,
      `🏷 Тип: <b>${this.taskTypeLabel(payload.taskType)}</b>`,
      `👤 Предложил: <b>${this.escapeHtml(this.truncate(payload.creatorUsername, 80))}</b>`,
    ];

    if (payload.description) {
      lines.push('', `📖 ${this.escapeHtml(this.truncate(payload.description, 600))}`);
    }

    lines.push('', '🗳 Задание уже доступно для голосования.');

    return this.singleMediaPost(payload.image, lines.join('\n'));
  }

  private renderBossActivated(payload: ReturnType<typeof bossActivatedPayloadSchema.parse>) {
    const lines = [
      '🚨 <b>НОВЫЙ БОСС В БОЮ</b>',
      '',
      `👹 <b>${this.escapeHtml(this.truncate(payload.name, 180))}</b>`,
    ];

    if (payload.description) {
      lines.push('', `📖 ${this.escapeHtml(this.truncate(payload.description, 560))}`);
    }

    lines.push(
      '',
      `⏳ Битва завершится: <b>${this.formatMoscowDateTime(payload.endsAt)}</b>`,
      '',
      '⚔️ Объединяйтесь и нанесите боссу как можно больше урона!',
    );

    return this.singleMediaPost(payload.imageUrl, lines.join('\n'));
  }

  private renderBossDefeated(payload: ReturnType<typeof bossDefeatedPayloadSchema.parse>) {
    const lines = [
      '🏆 <b>БОСС ПОВЕРЖЕН</b>',
      '',
      `👹 <b>${this.escapeHtml(this.truncate(payload.name, 180))}</b> больше не угрожает миру!`,
      '',
      '🌟 <b>Лучшие герои битвы</b>',
    ];

    if (payload.topPlayers.length === 0) {
      lines.push('Участников нет.');
    } else {
      for (const [index, player] of payload.topPlayers.slice(0, 3).entries()) {
        lines.push(
          `${this.placeMedal(index)} <b>${this.escapeHtml(this.truncate(player.username, 80))}</b> — ${player.totalDamage.toLocaleString('ru-RU')} урона`,
        );
      }
    }

    lines.push('', '🎉 Спасибо всем участникам! Награды уже ждут своих героев.');

    return this.singleMediaPost(payload.imageUrl, lines.join('\n'));
  }

  private renderDailyDigest(payload: ReturnType<typeof dailyDigestPayloadSchema.parse>) {
    const date = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${payload.date}T12:00:00.000Z`));
    const lines = [
      `🌙 <b>Итоги дня — ${this.escapeHtml(date)}</b>`,
      '',
      `✅ Выполнено заданий: <b>${payload.completedTasksCount.toLocaleString('ru-RU')}</b>`,
      '',
      '🏆 <b>Тройка общего рейтинга</b>',
    ];

    if (payload.leaderboard.length === 0) {
      lines.push('Пока нет участников рейтинга.');
    } else {
      for (const [index, leader] of payload.leaderboard.slice(0, 3).entries()) {
        lines.push(
          `${this.placeMedal(index)} <b>${this.escapeHtml(this.truncate(leader.username, 80))}</b> — ${leader.gameScore.toLocaleString('ru-RU')} очков`,
        );
      }
    }

    lines.push('', `🛍 <b>Покупки дня (${payload.purchases.length})</b>`);

    if (payload.purchases.length === 0) {
      lines.push('Сегодня предметы не покупали.');
    } else {
      for (const purchase of payload.purchases) {
        lines.push(
          `• <b>${this.escapeHtml(this.truncate(purchase.buyerUsername, 80))}</b> приобрёл «${this.escapeHtml(this.truncate(purchase.itemName, 180))}» — ${this.rarityLabel(purchase.rarity)}`,
        );
      }
    }

    lines.push('', '✨ Новый день — новые задания, сражения и достижения!');

    return {
      image: null,
      messages: this.chunkCompleteLines(lines),
    };
  }

  private singleMediaPost(image: string | null, text: string): RenderedTelegramPost {
    if (text.length > TELEGRAM_CAPTION_LIMIT) {
      throw new Error(`Telegram media caption exceeds ${TELEGRAM_CAPTION_LIMIT} characters`);
    }

    return { image, messages: [text] };
  }

  private chunkCompleteLines(lines: string[]): string[] {
    const chunks: string[] = [];
    let currentLines: string[] = [];

    for (const line of lines) {
      const safeLine = this.truncate(line, MESSAGE_CHUNK_TARGET);
      const candidate = [...currentLines, safeLine].join('\n');

      if (candidate.length > MESSAGE_CHUNK_TARGET && currentLines.length > 0) {
        chunks.push(currentLines.join('\n'));
        currentLines = ['📜 <b>Итоги дня — продолжение</b>', '', safeLine];
      } else {
        currentLines.push(safeLine);
      }
    }

    if (currentLines.length > 0) {
      chunks.push(currentLines.join('\n'));
    }

    if (chunks.some((chunk) => chunk.length > TELEGRAM_MESSAGE_LIMIT)) {
      throw new Error(`Telegram message exceeds ${TELEGRAM_MESSAGE_LIMIT} characters`);
    }

    return chunks;
  }

  private taskTypeLabel(type: 'daily' | 'weekly' | 'event'): string {
    return {
      daily: 'Ежедневное',
      weekly: 'Еженедельное',
      event: 'Событийное',
    }[type];
  }

  private rarityLabel(rarity: 'unterlyanskiy' | 'basic_minimum' | 'sigma' | 'bezumnyy') {
    return {
      unterlyanskiy: '🔵 Unterlyanskiy',
      basic_minimum: '🟢 Basic minimum',
      sigma: '🟣 Sigma',
      bezumnyy: '🟠 Bezumnyy',
    }[rarity];
  }

  private placeMedal(index: number): string {
    return ['🥇', '🥈', '🥉'][index] ?? '•';
  }

  private formatMoscowDateTime(value: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    }).format(new Date(value));
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  }

  private escapeHtml(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }
}
