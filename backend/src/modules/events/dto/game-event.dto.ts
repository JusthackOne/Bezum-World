import { ApiProperty } from '@nestjs/swagger';

import { EventItemDto } from './event-item.dto';
import { EventUserDto } from './event-user.dto';

export class PurchaseGameEventDto {
  @ApiProperty({ example: 'b4d77f96-74bd-46d1-b5de-a3f0f4e5e1d5' })
  id!: string;

  @ApiProperty({ example: 'PURCHASE' })
  type!: 'PURCHASE';

  @ApiProperty({ example: '2026-07-11T11:10:00.000Z' })
  created_at!: string;

  @ApiProperty({ type: EventUserDto })
  user!: EventUserDto;

  @ApiProperty({ type: EventItemDto })
  item!: EventItemDto;
}

export class BattleGameEventDto {
  @ApiProperty({ example: 'b4d77f96-74bd-46d1-b5de-a3f0f4e5e1d5' })
  id!: string;

  @ApiProperty({ example: 'BATTLE' })
  type!: 'BATTLE';

  @ApiProperty({ example: '2026-07-11T11:10:00.000Z' })
  created_at!: string;

  @ApiProperty({ type: EventUserDto })
  challenger!: EventUserDto;

  @ApiProperty({ type: EventUserDto })
  opponent!: EventUserDto;

  @ApiProperty({ type: EventUserDto })
  winner!: EventUserDto;

  @ApiProperty({ example: 'WIN' })
  result!: 'WIN' | 'LOSE';

  @ApiProperty({ example: 15 })
  gameScoreReward!: number;

  @ApiProperty({ example: 30 })
  goldReward!: number;
}

export type GameEventDto = PurchaseGameEventDto | BattleGameEventDto;
