import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriorityLevel } from '../enums/goal.enum';

export class CreateGoalDto {
  @ApiProperty({
    example: 'Aprender Francés Básico',
    description: 'Título descriptivo del objetivo',
  })
  @IsNotEmpty({ message: 'El título del objetivo es obligatorio' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Quiero aprender frases esenciales para viajar a París el próximo año.',
    description: 'Descripción en lenguaje natural del objetivo para alimentar el motor de IA',
  })
  @IsNotEmpty({ message: 'La descripción del objetivo es obligatoria' })
  @IsString()
  user_description: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Fecha límite estimada para alcanzar el objetivo (formato YYYY-MM-DD)',
    type: String,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha límite debe tener un formato válido (YYYY-MM-DD)' })
  due_date?: Date;

  @ApiPropertyOptional({
    example: 'medium',
    enum: PriorityLevel,
    description: 'Nivel de prioridad del objetivo (high, medium, low)',
    default: PriorityLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(PriorityLevel, { message: 'La prioridad debe ser high, medium o low' })
  priority?: PriorityLevel;
}
