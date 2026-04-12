import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AuthStatusQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  echo?: string;
}
