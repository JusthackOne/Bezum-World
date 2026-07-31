import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsHexColor,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const TEAM_SIDES = ['TEAM_A', 'TEAM_B'] as const;
const TERRAIN_TYPES = ['GROUND', 'MOUNTAIN'] as const;
const BUILDING_TYPES = ['TOWN_HALL', 'GOLD_BUILDING', 'ATTRIBUTE_BUILDING'] as const;
const ATTRIBUTE_KEYS = ['strength', 'charisma', 'endurance', 'intelligence'] as const;
const TOWER_STATUSES = ['UNDER_CONSTRUCTION', 'ACTIVE', 'DESTROYED', 'CANCELLED'] as const;
const GAME_STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d{0,17})(?:\.\d{1,12})?$/;

export class CivilizationGameIdParamsDto {
  @IsUUID()
  gameId!: string;
}

export class CivilizationPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

export class CivilizationAdminListDto extends CivilizationPaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(GAME_STATUSES)
  status?: (typeof GAME_STATUSES)[number];
}

export class HexCoordinateDto {
  @Type(() => Number)
  @IsInt()
  @Min(-25)
  @Max(25)
  q!: number;

  @Type(() => Number)
  @IsInt()
  @Min(-25)
  @Max(25)
  r!: number;
}

export class CivilizationTeamInputDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsIn(TEAM_SIDES)
  side!: (typeof TEAM_SIDES)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsHexColor()
  color!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  visualKey!: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  playerIds!: string[];
}

export class CivilizationTileInputDto extends HexCoordinateDto {
  @IsIn(TERRAIN_TYPES)
  terrainType!: (typeof TERRAIN_TYPES)[number];

  @IsOptional()
  @IsIn(TEAM_SIDES)
  ownerTeamSide?: (typeof TEAM_SIDES)[number] | null;
}

export class CivilizationSpawnPointInputDto extends HexCoordinateDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  tileId?: string;

  @IsIn(TEAM_SIDES)
  teamSide!: (typeof TEAM_SIDES)[number];
}

export class CivilizationBuildingInputDto extends HexCoordinateDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsIn(BUILDING_TYPES)
  type!: (typeof BUILDING_TYPES)[number];

  @IsOptional()
  @IsIn(ATTRIBUTE_KEYS)
  attributeKey?: (typeof ATTRIBUTE_KEYS)[number] | null;

  @IsOptional()
  @IsIn(TEAM_SIDES)
  ownerTeamSide?: (typeof TEAM_SIDES)[number] | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  captureRequiredUnits?: number;

  @IsOptional()
  @IsString()
  @Matches(DECIMAL_PATTERN)
  incomePerHour?: string;
}

export class CivilizationPlayerPlacementInputDto extends HexCoordinateDto {
  @IsUUID()
  userId!: string;

  @IsIn(TEAM_SIDES)
  teamSide!: (typeof TEAM_SIDES)[number];

  @ValidateNested()
  @Type(() => HexCoordinateDto)
  spawn!: HexCoordinateDto;
}

export class CivilizationTowerInputDto extends HexCoordinateDto {
  @IsIn(TEAM_SIDES)
  teamSide!: (typeof TEAM_SIDES)[number];

  @IsOptional()
  @IsIn(TOWER_STATUSES)
  status?: (typeof TOWER_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  protectionRadius?: number;
}

export class CivilizationMapInputDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CivilizationTileInputDto)
  tiles!: CivilizationTileInputDto[];

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CivilizationSpawnPointInputDto)
  spawnPoints!: CivilizationSpawnPointInputDto[];

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CivilizationBuildingInputDto)
  buildings!: CivilizationBuildingInputDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CivilizationPlayerPlacementInputDto)
  playerPlacements!: CivilizationPlayerPlacementInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CivilizationTowerInputDto)
  towers: CivilizationTowerInputDto[] = [];
}

export class CreateCivilizationGameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => CivilizationTeamInputDto)
  teams!: CivilizationTeamInputDto[];

  @ValidateNested()
  @Type(() => CivilizationMapInputDto)
  map!: CivilizationMapInputDto;

  @IsObject()
  settings!: Record<string, unknown>;
}

export class UpdateCivilizationGameDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => CivilizationTeamInputDto)
  teams?: CivilizationTeamInputDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CivilizationMapInputDto)
  map?: CivilizationMapInputDto;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class CivilizationActionDto {
  @IsUUID()
  actionId!: string;
}

export class MoveCivilizationPlayerDto extends CivilizationActionDto {
  @ValidateNested()
  @Type(() => HexCoordinateDto)
  target!: HexCoordinateDto;
}

export class AttackCivilizationPlayerDto extends CivilizationActionDto {
  @IsUUID()
  targetPlayerId!: string;
}

export class CaptureCivilizationBuildingDto extends CivilizationActionDto {
  @IsUUID()
  buildingId!: string;
}

export class BuildCivilizationTowerDto extends CivilizationActionDto {
  @ValidateNested()
  @Type(() => HexCoordinateDto)
  tile!: HexCoordinateDto;
}

export class CivilizationTowerActionDto extends CivilizationActionDto {
  @IsUUID()
  towerId!: string;
}

export class CivilizationTownHallActionDto extends CivilizationActionDto {
  @IsUUID()
  townHallBuildingId!: string;
}

export class AddActiveCivilizationPlayerDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  teamId!: string;

  @IsUUID()
  spawnTileId!: string;
}

export class ForceCompleteCivilizationGameDto {
  @IsOptional()
  @IsUUID()
  winnerTeamId?: string | null;
}
