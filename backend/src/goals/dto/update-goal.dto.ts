import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PriorityLevel, GoalStatus } from '../enums/goal.enum';

export class UpdateGoalDto {
  @ApiPropertyOptional({
    example: 'Aprender Francés Intermedio',
    description: 'Nuevo título del objetivo',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'Nueva descripción detallada del objetivo',
    description: 'Descripción en lenguaje natural actualizada',
  })
  @IsOptional()
  @IsString()
  user_description?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Fecha límite actualizada (formato YYYY-MM-DD)',
    type: String,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha límite debe tener un formato válido (YYYY-MM-DD)' })
  due_date?: Date;

  @ApiPropertyOptional({
    example: 'high',
    enum: PriorityLevel,
    description: 'Nivel de prioridad del objetivo',
  })
  @IsOptional()
  @IsEnum(PriorityLevel, { message: 'La prioridad debe ser high, medium o low' })
  priority?: PriorityLevel;

  @ApiPropertyOptional({
    example: 'active',
    enum: GoalStatus,
    description: 'Estado del objetivo (active, paused, completed, archived)',
  })
  @IsOptional()
  @IsEnum(GoalStatus, { message: 'El estado debe ser active, paused, completed o archived' })
  status?: GoalStatus;
}
