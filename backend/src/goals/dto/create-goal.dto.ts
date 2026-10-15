import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriorityLevel } from '../enums/goal.enum';

export class CreateGoalDto {
  @ApiProperty({
    example: 'Aprender Francés Básico',
    description: 'Título o nombre principal del objetivo',
    maxLength: 120,
  })
  @IsNotEmpty({ message: 'El título del objetivo es obligatorio' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Quiero aprender francés para viajar el próximo año y comunicarme en situaciones cotidianas.',
    description: 'Descripción detallada o motivación del objetivo',
  })
  @IsNotEmpty({ message: 'La descripción del objetivo es obligatoria' })
  @IsString()
  user_description: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Fecha límite estimada para cumplir el objetivo (Formato YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha límite debe tener un formato válido (YYYY-MM-DD)' })
  due_date?: Date;

  @ApiPropertyOptional({
    enum: PriorityLevel,
    example: PriorityLevel.MEDIUM,
    description: 'Nivel de prioridad del objetivo (high, medium, low)',
    default: PriorityLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(PriorityLevel, { message: 'La prioridad debe ser high, medium o low' })
  priority?: PriorityLevel;
}
