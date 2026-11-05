import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkSessionDto {
  @ApiProperty({
    description: 'Tiempo dedicado a la actividad en minutos (HU-17)',
    example: 45,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Los minutos dedicados son obligatorios' })
  @IsInt({ message: 'Los minutos dedicados deben ser un número entero' })
  @Min(1, { message: 'Los minutos dedicados deben ser de al menos 1 minuto' })
  minutes_spent: number;

  @ApiPropertyOptional({
    description: 'Fecha en la que se realizó la sesión (formato YYYY-MM-DD). Si se omite, se usa la fecha actual.',
    example: '2026-11-04',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener formato YYYY-MM-DD',
  })
  session_date?: string;

  @ApiPropertyOptional({
    description: 'Nivel de dificultad percibido en escala de 1 a 5 (HU-18)',
    example: 3,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt({ message: 'El nivel de dificultad debe ser un entero entre 1 y 5' })
  @Min(1, { message: 'El nivel de dificultad mínimo es 1' })
  @Max(5, { message: 'El nivel de dificultad máximo es 5' })
  difficulty_level?: number;

  @ApiPropertyOptional({
    description: 'Notas u observaciones del usuario sobre dificultades o avances (HU-18)',
    example: 'Me costó entender los primeros conceptos pero logré avanzar.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser una cadena de texto' })
  @MaxLength(1000, { message: 'Las notas no pueden superar los 1000 caracteres' })
  difficulty_notes?: string;
}
