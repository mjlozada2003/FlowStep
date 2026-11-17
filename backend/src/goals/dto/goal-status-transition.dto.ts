import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GoalStatusTransitionDto {
  @ApiPropertyOptional({
    description: 'Motivo del cambio de estado para registrar en el historial de transiciones',
    example: 'Semana de exámenes y falta de tiempo temporal',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
