import { ApiProperty } from '@nestjs/swagger';

export class PublicUserAttributesDto {
  @ApiProperty({
    description: 'Strength attribute value in range 0..100',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  strength!: number;

  @ApiProperty({
    description: 'Charisma attribute value in range 0..100',
    example: 25,
    minimum: 0,
    maximum: 100,
  })
  charisma!: number;

  @ApiProperty({
    description: 'Endurance attribute value in range 0..100',
    example: 40,
    minimum: 0,
    maximum: 100,
  })
  endurance!: number;

  @ApiProperty({
    description: 'Intelligence attribute value in range 0..100',
    example: 30,
    minimum: 0,
    maximum: 100,
  })
  intelligence!: number;
}
