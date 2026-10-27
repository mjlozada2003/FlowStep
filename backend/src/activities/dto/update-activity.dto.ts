import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ActivityType, ActivityStatus } from '../enums/activity.enum';
import { PriorityLevel } from '../../goals/enums/goal.enum';

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ActivityType, {
    message: 'El tipo debe ser: learning, practice, exercise, assessment o reinforcement',
  })
  type?: ActivityType;

  @IsOptional()
  @IsEnum(PriorityLevel, { message: 'La prioridad debe ser high, medium o low' })
  priority?: PriorityLevel;

  @IsOptional()
  @IsEnum(ActivityStatus, {
    message: 'El estado debe ser: pending, in_progress, completed o skipped',
  })
  status?: ActivityStatus;

  @IsOptional()
  @IsInt({ message: 'Los minutos estimados deben ser un número entero' })
  @Min(1, { message: 'Los minutos estimados deben ser mayores a 0' })
  estimated_minutes?: number;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsInt()
  parent_activity_id?: number;
}
