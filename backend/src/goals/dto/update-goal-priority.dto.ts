import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PriorityLevel } from '../enums/goal.enum';

export class UpdateGoalPriorityDto {
  @ApiProperty({
    example: 'high',
    enum: PriorityLevel,
    description: 'Nueva prioridad del objetivo (HU-06)',
  })
  @IsNotEmpty({ message: 'La prioridad es obligatoria' })
  @IsEnum(PriorityLevel, { message: 'La prioridad debe ser high, medium o low' })
  priority: PriorityLevel;
}
