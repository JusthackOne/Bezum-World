import { ApiProperty } from '@nestjs/swagger';

import { BattlePlayerDto } from './battle-player.dto';

export class BattlePlayersResponseDto {
  @ApiProperty({
    description: 'List of opponents available in battles page',
    type: BattlePlayerDto,
    isArray: true,
  })
  players!: BattlePlayerDto[];
}
