import { IsInt, IsOptional, IsPositive, IsString, IsDateString } from 'class-validator';

export class CreateStepDto {
  @IsInt()
  @IsPositive()
  count!: number;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
