import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ItemSellerDto {
  @ApiProperty({ description: 'Seller account id' })
  id!: string;

  @ApiProperty({ description: 'Seller nickname', example: 'iron-wolf' })
  nickname!: string;

  @ApiPropertyOptional({ description: 'Seller avatar URL', nullable: true })
  avatarUrl!: string | null;
}
