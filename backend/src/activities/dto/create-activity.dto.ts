import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType } from '../enums/activity.enum';
import { PriorityLevel } from '../../goals/enums/goal.enum';

export class CreateActivityDto {
  @ApiProperty({
    example: 'Practicar pronunciación de fonemas franceses',
    description: 'Título descriptivo de la actividad',
  })
  @IsNotEmpty({ message: 'El título de la actividad es obligatorio' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'Escuchar y repetir ejercicios del capítulo 1',
    description: 'Descripción detallada o instrucciones para realizar la actividad',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'practice',
    enum: ActivityType,
    description: 'Tipo pedagógico de la actividad (learning, practice, exercise, assessment, reinforcement)',
  })
  @IsNotEmpty({ message: 'El tipo de actividad es obligatorio' })
  @IsEnum(ActivityType, {
    message: 'El tipo debe ser: learning, practice, exercise, assessment o reinforcement',
  })
  type: ActivityType;

  @ApiPropertyOptional({
    example: 'medium',
    enum: PriorityLevel,
    description: 'Prioridad asignada a la actividad (high, medium, low)',
    default: PriorityLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(PriorityLevel, { message: 'La prioridad debe ser high, medium o low' })
  priority?: PriorityLevel;

  @ApiProperty({
    example: 45,
    description: 'Duración estimada en minutos para completar la actividad (debe ser mayor a 0)',
  })
  @IsNotEmpty({ message: 'Los minutos estimados son obligatorios' })
  @IsInt({ message: 'Los minutos estimados deben ser un número entero' })
  @Min(1, { message: 'Los minutos estimados deben ser mayores a 0' })
  estimated_minutes: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID de la actividad padre si esta actividad es una sub-tarea dividida',
  })
  @IsOptional()
  @IsInt()
  parent_activity_id?: number;
}
