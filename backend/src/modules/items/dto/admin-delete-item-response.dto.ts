import { ApiProperty } from '@nestjs/swagger';

export class AdminDeleteItemResponseDto {
  @ApiProperty({
    description: 'Deletion result message',
    example: 'Item deleted',
  })
  message!: string;

  @ApiProperty({
    description: 'Deleted item identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  itemId!: string;
}
