import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BattleEventResult, GameEventType, type Prisma } from '@prisma/client';

import type {
  BattleGameEventDto,
  EventItemDto,
  EventUserDto,
  EventsResponseDto,
  GameEventDto,
  PurchaseGameEventDto,
} from './dto';
import { EventRepository, type GameEventRecord } from './repositories';
import { EventFilter } from './types/event-filter.type';

const EVENTS_PAGE_SIZE = 10;

@Injectable()
export class EventsService {
  constructor(private readonly eventRepository: EventRepository) {}

  async getEvents(filter: EventFilter = EventFilter.all, page = 1): Promise<EventsResponseDto> {
    const eventType = this.toGameEventType(filter);
    const { events, total } = await this.eventRepository.findEvents({
      page,
      limit: EVENTS_PAGE_SIZE,
      ...(eventType ? { type: eventType } : {}),
    });

    return {
      filter,
      events: events.map((event) => this.toEventDto(event)),
      pagination: {
        page,
        limit: EVENTS_PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / EVENTS_PAGE_SIZE),
      },
    };
  }

  async createPurchaseEvent(
    input: { userId: string; itemId: string },
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.eventRepository.createPurchaseEvent(input, tx);
  }

  async createBattleEvent(
    input: {
      challengerId: string;
      opponentId: string;
      winnerId: string;
      challengerWon: boolean;
      gameScoreReward: number;
      goldReward: number;
    },
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.eventRepository.createBattleEvent(
      {
        challengerId: input.challengerId,
        opponentId: input.opponentId,
        winnerId: input.winnerId,
        result: input.challengerWon ? BattleEventResult.WIN : BattleEventResult.LOSE,
        gameScoreReward: input.gameScoreReward,
        goldReward: input.goldReward,
      },
      tx,
    );
  }

  private toGameEventType(filter: EventFilter): GameEventType | undefined {
    switch (filter) {
      case EventFilter.battles:
        return GameEventType.BATTLE;
      case EventFilter.purchases:
        return GameEventType.PURCHASE;
      case EventFilter.all:
        return undefined;
      default:
        return undefined;
    }
  }

  private toEventDto(event: GameEventRecord): GameEventDto {
    if (event.type === GameEventType.PURCHASE) {
      if (!event.purchaseUser || !event.item) {
        throw new InternalServerErrorException('Purchase event references are incomplete');
      }

      return {
        id: event.id,
        type: 'PURCHASE',
        created_at: event.createdAt.toISOString(),
        user: this.toUserDto(event.purchaseUser),
        item: this.toItemDto(event.item),
      } satisfies PurchaseGameEventDto;
    }

    if (!event.challenger || !event.opponent || !event.winner || !event.battleResult) {
      throw new InternalServerErrorException('Battle event references are incomplete');
    }

    return {
      id: event.id,
      type: 'BATTLE',
      created_at: event.createdAt.toISOString(),
      challenger: this.toUserDto(event.challenger),
      opponent: this.toUserDto(event.opponent),
      winner: this.toUserDto(event.winner),
      result: event.battleResult,
      gameScoreReward: event.gameScoreReward ?? 0,
      goldReward: event.goldReward ?? 0,
    } satisfies BattleGameEventDto;
  }

  private toUserDto(user: { id: string; username: string; avatarUrl: string | null }): EventUserDto {
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatarUrl,
    };
  }

  private toItemDto(item: GameEventRecord['item']): EventItemDto {
    if (!item) {
      throw new InternalServerErrorException('Event item is missing');
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      image_url: item.imageUrl,
      strength: item.strength,
      charisma: item.charisma,
      agility: item.agility,
      intelligence: item.intelligence,
      price: item.price,
      rarity: item.rarity,
      slotType: item.slotType,
      durability: item.durability,
      created_at: item.createdAt.toISOString(),
    };
  }
}
