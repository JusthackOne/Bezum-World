import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StartBattleParamsDto {
  @ApiProperty({
    description: 'Opponent user id',
    example: '2ad55bcf-4ee2-4a44-86cd-e62052d51a3f',
  })
  @IsUUID('4')
  opponentUserId!: string;
}
