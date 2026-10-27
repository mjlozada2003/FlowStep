import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PriorityLevel, GoalStatus } from '../enums/goal.enum';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  user_description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha límite debe tener un formato válido (YYYY-MM-DD)' })
  due_date?: Date;

  @IsOptional()
  @IsEnum(PriorityLevel, { message: 'La prioridad debe ser high, medium o low' })
  priority?: PriorityLevel;

  @IsOptional()
  @IsEnum(GoalStatus, { message: 'El estado debe ser active, paused, completed o archived' })
  status?: GoalStatus;
}
