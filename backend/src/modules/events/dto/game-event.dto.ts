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

export class CompletedTaskDto {
  @ApiProperty({ example: 'b8ea8912-990a-462c-88f6-bdcd880f623e' })
  id!: string;

  @ApiProperty({ example: 'event' })
  type!: string;

  @ApiProperty({ example: 'Finish the launch quest' })
  title!: string;

  @ApiProperty({ example: '/uploads/tasks/launch-quest.jpg', nullable: true })
  image!: string | null;
}

export class TaskCompletedGameEventDto {
  @ApiProperty({ example: 'b4d77f96-74bd-46d1-b5de-a3f0f4e5e1d5' })
  id!: string;

  @ApiProperty({ example: 'TASK_COMPLETED' })
  type!: 'TASK_COMPLETED';

  @ApiProperty({ example: '2026-07-11T11:10:00.000Z' })
  created_at!: string;

  @ApiProperty({ type: EventUserDto })
  user!: EventUserDto;

  @ApiProperty({ type: CompletedTaskDto })
  task!: CompletedTaskDto;

  @ApiProperty({ example: 'bb912f16-4d88-422d-ad57-929ee6f04ef4' })
  submissionId!: string;

  @ApiProperty({ example: '/uploads/task-proofs/proof.jpg', nullable: true })
  proofImage!: string | null;
}

export type GameEventDto = PurchaseGameEventDto | BattleGameEventDto | TaskCompletedGameEventDto;
