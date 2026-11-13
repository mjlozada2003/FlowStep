import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGoalDueDateDto {
  @ApiProperty({
    description: 'Nueva fecha límite del objetivo (formato YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsNotEmpty({ message: 'La fecha límite es obligatoria' })
  @IsDateString({}, { message: 'La fecha límite debe tener un formato válido (YYYY-MM-DD)' })
  due_date: string;

  @ApiPropertyOptional({
    description: 'Motivo del cambio de fecha para registrar en el historial',
    example: 'Ampliación de plazo por nuevo alcance del proyecto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
