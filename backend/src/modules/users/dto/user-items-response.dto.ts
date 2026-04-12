import { ApiProperty } from '@nestjs/swagger';

import { UserOwnedItemDto } from './user-owned-item.dto';

export class UserItemsResponseDto {
  @ApiProperty({
    description: 'Public username',
    example: 'mike123',
  })
  username!: string;

  @ApiProperty({
    description: 'Items currently owned by this user',
    type: UserOwnedItemDto,
    isArray: true,
  })
  items!: UserOwnedItemDto[];
}
