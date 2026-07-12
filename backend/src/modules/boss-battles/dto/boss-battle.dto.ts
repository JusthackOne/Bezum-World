import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { EquipmentSlotType, ItemRarity } from '@prisma/client';

export class BossAttributesDto {
  @IsInt() @Min(0) strength!: number;
  @IsInt() @Min(0) charisma!: number;
  @IsInt() @Min(0) endurance!: number;
  @IsInt() @Min(0) intelligence!: number;
}

export class BossRewardItemDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsEnum(EquipmentSlotType) slotType!: EquipmentSlotType;
  @IsEnum(ItemRarity) rarity!: ItemRarity;
  @IsOptional() @IsInt() @Min(0) durability?: number;
  @IsOptional() @ValidateNested() @Type(() => BossAttributesDto) attributes?: BossAttributesDto;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class BossRewardDto {
  @IsInt() @Min(1) placeFrom!: number;
  @IsInt() @Min(1) placeTo!: number;
  @IsOptional() @IsInt() @Min(0) gold?: number;
  @IsOptional() @IsInt() @Min(0) gameScore?: number;
  @IsOptional() @ValidateNested() @Type(() => BossAttributesDto) attributes?: BossAttributesDto;
  @IsOptional() @ValidateNested() @Type(() => BossRewardItemDto) item?: BossRewardItemDto;
}

export class CreateBossBattleDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsInt() @Min(1) initialHp!: number;
  @ValidateNested() @Type(() => BossAttributesDto) attributes!: BossAttributesDto;
  @IsInt() @Min(1) attackCooldownSeconds!: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => BossRewardDto) rewards!: BossRewardDto[];
  @IsOptional() @IsBoolean() publish?: boolean;
}

export class UpdateBossBattleDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsInt() @Min(1) initialHp?: number;
  @IsOptional() @ValidateNested() @Type(() => BossAttributesDto) attributes?: BossAttributesDto;
  @IsOptional() @IsInt() @Min(1) attackCooldownSeconds?: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BossRewardDto)
  rewards?: BossRewardDto[];
}

export class FinishBossBattleDto {
  @IsBoolean() confirm!: boolean;
  @IsBoolean() grantRewards!: boolean;
}

export class BossBattleIdParamsDto {
  @IsUUID() id!: string;
}
export class BossLeaderboardQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit = 20;
}
