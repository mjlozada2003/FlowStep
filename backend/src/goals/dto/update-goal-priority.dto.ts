import { IsEnum, IsNotEmpty } from 'class-validator';
import { PriorityLevel } from '../enums/goal.enum';

export class UpdateGoalPriorityDto {
  @IsNotEmpty({ message: 'La prioridad es obligatoria' })
  @IsEnum(PriorityLevel, { message: 'La prioridad debe ser high, medium o low' })
  priority: PriorityLevel;
}
