import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ActivityType } from '../enums/activity.enum';
import { PriorityLevel } from '../../goals/enums/goal.enum';

export class CreateActivityDto {
  @IsNotEmpty({ message: 'El título de la actividad es obligatorio' })
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'El tipo de actividad es obligatorio' })
  @IsEnum(ActivityType, {
    message: 'El tipo debe ser: learning, practice, exercise, assessment o reinforcement',
  })
  type: ActivityType;

  @IsOptional()
  @IsEnum(PriorityLevel, { message: 'La prioridad debe ser high, medium o low' })
  priority?: PriorityLevel;

  @IsNotEmpty({ message: 'Los minutos estimados son obligatorios' })
  @IsInt({ message: 'Los minutos estimados deben ser un número entero' })
  @Min(1, { message: 'Los minutos estimados deben ser mayores a 0' })
  estimated_minutes: number;

  @IsOptional()
  @IsInt()
  parent_activity_id?: number;
}
