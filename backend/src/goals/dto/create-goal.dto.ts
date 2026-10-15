import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PriorityLevel } from '../enums/goal.enum';

export class CreateGoalDto {
  @IsNotEmpty({ message: 'El título del objetivo es obligatorio' })
  @IsString()
  title: string;

  @IsNotEmpty({ message: 'La descripción del objetivo es obligatoria' })
  @IsString()
  user_description: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha límite debe tener un formato válido (YYYY-MM-DD)' })
  due_date?: Date;

  @IsOptional()
  @IsEnum(PriorityLevel, { message: 'La prioridad debe ser high, medium o low' })
  priority?: PriorityLevel;
}
