import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType, ActivityStatus } from '../enums/activity.enum';
import { PriorityLevel } from '../../goals/enums/goal.enum';

export class UpdateActivityDto {
  @ApiPropertyOptional({
    example: 'Practicar pronunciación de fonemas franceses y consonantes',
    description: 'Nuevo título de la actividad',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'Instrucciones ampliadas para la sesión',
    description: 'Descripción detallada actualizada',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'practice',
    enum: ActivityType,
    description: 'Tipo pedagógico de la actividad',
  })
  @IsOptional()
  @IsEnum(ActivityType, {
    message: 'El tipo debe ser: learning, practice, exercise, assessment o reinforcement',
  })
  type?: ActivityType;

  @ApiPropertyOptional({
    example: 'high',
    enum: PriorityLevel,
    description: 'Prioridad de la actividad',
  })
  @IsOptional()
  @IsEnum(PriorityLevel, { message: 'La prioridad debe ser high, medium o low' })
  priority?: PriorityLevel;

  @ApiPropertyOptional({
    example: 'pending',
    enum: ActivityStatus,
    description: 'Estado de la actividad (pending, in_progress, completed, skipped)',
  })
  @IsOptional()
  @IsEnum(ActivityStatus, {
    message: 'El estado debe ser: pending, in_progress, completed o skipped',
  })
  status?: ActivityStatus;

  @ApiPropertyOptional({
    example: 60,
    description: 'Duración estimada en minutos (mayor a 0)',
  })
  @IsOptional()
  @IsInt({ message: 'Los minutos estimados deben ser un número entero' })
  @Min(1, { message: 'Los minutos estimados deben ser mayores a 0' })
  estimated_minutes?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Orden de ejecución dentro de la etapa',
  })
  @IsOptional()
  @IsInt()
  sort_order?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID de la actividad padre si es una sub-tarea',
  })
  @IsOptional()
  @IsInt()
  parent_activity_id?: number;
}
