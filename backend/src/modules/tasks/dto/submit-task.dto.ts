import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitTaskDto {
  @ApiPropertyOptional({
    description: 'Proof image URL',
    example: 'https://cdn.example.com/proofs/workout-1.png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  proofImage?: string;
}
