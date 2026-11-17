import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteActivityDto {
  @ApiPropertyOptional({
    description: 'Motivo por el cual se elimina la actividad',
    example: 'No es relevante para mi objetivo actual',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
