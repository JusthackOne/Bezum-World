import { Injectable } from '@nestjs/common';
import { NotificationEventType, type NotificationOutbox } from '@prisma/client';

import {
  bossActivatedPayloadSchema,
  bossDefeatedPayloadSchema,
  civilizationGameCompletedPayloadSchema,
  dailyDigestPayloadSchema,
  taskCompletedPayloadSchema,
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
      case NotificationEventType.TASK_COMPLETED:
        return this.renderTaskCompleted(taskCompletedPayloadSchema.parse(outbox.payload));
      case NotificationEventType.BOSS_ACTIVATED:
        return this.renderBossActivated(bossActivatedPayloadSchema.parse(outbox.payload));
      case NotificationEventType.BOSS_DEFEATED:
        return this.renderBossDefeated(bossDefeatedPayloadSchema.parse(outbox.payload));
      case NotificationEventType.DAILY_DIGEST:
        return this.renderDailyDigest(dailyDigestPayloadSchema.parse(outbox.payload));
      case NotificationEventType.CIVILIZATION_GAME_COMPLETED:
        return this.renderCivilizationGameCompleted(
          civilizationGameCompletedPayloadSchema.parse(outbox.payload),
        );
    }
  }

  private renderTaskCompleted(payload: ReturnType<typeof taskCompletedPayloadSchema.parse>) {
    const rewards = [
      payload.rewards.money > 0 ? `🪙 ${payload.rewards.money.toLocaleString('ru-RU')}` : null,
      payload.rewards.gameScore > 0
        ? `⭐ ${payload.rewards.gameScore.toLocaleString('ru-RU')}`
        : null,
      payload.rewards.strength > 0 ? `💪 ${payload.rewards.strength}` : null,
      payload.rewards.intelligence > 0 ? `🧠 ${payload.rewards.intelligence}` : null,
      payload.rewards.charisma > 0 ? `💬 ${payload.rewards.charisma}` : null,
      payload.rewards.endurance > 0 ? `🛡 ${payload.rewards.endurance}` : null,
    ].filter((reward): reward is string => reward !== null);
    const lines = [
      '🏆 <b>СОБЫТИЕ ЗАВЕРШЕНО</b>',
      '',
      `🎯 <b>${this.escapeHtml(this.truncate(payload.title, 220))}</b>`,
      `🏷 Тип: <b>${this.taskTypeLabel(payload.taskType)}</b>`,
      `👤 Выполнил: <b>${this.escapeHtml(this.truncate(payload.completedByUsername, 80))}</b>`,
      `🎁 Награда: <b>${rewards.length > 0 ? rewards.join(' · ') : 'без награды'}</b>`,
      `🕒 ${this.formatMoscowDateTime(payload.completedAt)} (МСК)`,
    ];

    return this.singleMediaPost(payload.proofImage, lines.join('\n'));
  }

  private renderCivilizationGameCompleted(
    payload: ReturnType<typeof civilizationGameCompletedPayloadSchema.parse>,
  ): RenderedTelegramPost {
    const winner = payload.teams.find((team) => team.id === payload.winnerTeamId);
    const lines = [
      '🏰 <b>ИГРА CIVA ЗАВЕРШЕНА</b>',
      '',
      `⚔️ <b>${this.escapeHtml(this.truncate(payload.gameName, 180))}</b>`,
      `📅 ${this.formatMoscowDateTime(payload.completedAt)} (МСК)`,
      '',
      winner
        ? `🏆 Победитель: <b>${this.escapeHtml(this.truncate(winner.name, 100))}</b>`
        : '🤝 <b>Ничья — силы команд оказались равны</b>',
      `📜 ${this.civilizationCompletionReasonLabel(payload.reason)}`,
      '',
      '📊 <b>Итоговая таблица</b>',
    ];

    for (const [index, team] of payload.teams.entries()) {
      const winnerMark = team.id === payload.winnerTeamId ? ' 👑' : '';
      lines.push(
        '',
        `${index + 1}. <b>${this.escapeHtml(this.truncate(team.name, 100))}</b>${winnerMark} — <b>${this.formatDecimal(team.score)} очков</b>`,
        `   👥 ${team.playerCount} · 🪙 ${this.formatDecimal(team.gold)}`,
        `   💪 ${this.formatDecimal(team.attributes.strength)} · 💬 ${this.formatDecimal(team.attributes.charisma)} · 🛡 ${this.formatDecimal(team.attributes.endurance)} · 🧠 ${this.formatDecimal(team.attributes.intelligence)}`,
      );
    }

    lines.push('', '🎉 Спасибо всем участникам! Награды можно забрать в игре.');
    const text = lines.join('\n');
    if (text.length > TELEGRAM_MESSAGE_LIMIT) {
      throw new Error(`Telegram message exceeds ${TELEGRAM_MESSAGE_LIMIT} characters`);
    }
    return { image: null, messages: [text] };
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

  private civilizationCompletionReasonLabel(
    reason: 'TOWN_HALL_CAPTURED' | 'END_TIME_REACHED' | 'ADMIN_FORCE_COMPLETED',
  ): string {
    return {
      TOWN_HALL_CAPTURED: 'Вражеская ратуша была захвачена.',
      END_TIME_REACHED: 'Время игры истекло.',
      ADMIN_FORCE_COMPLETED: 'Игра завершена администратором.',
    }[reason];
  }

  private formatDecimal(value: string): string {
    const [integer, fraction] = value.split('.');
    const groupedInteger = integer!.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const trimmedFraction = fraction?.replace(/0+$/, '');
    return trimmedFraction ? `${groupedInteger},${trimmedFraction}` : groupedInteger;
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
