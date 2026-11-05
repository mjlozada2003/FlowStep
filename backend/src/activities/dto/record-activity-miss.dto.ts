import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordActivityMissDto {
  @ApiProperty({
    description: 'ID del motivo de incumplimiento según el catálogo MISS_REASON (1: Falta de tiempo, 2: Dificultad con la actividad, 3: Imprevisto, 4: Otro)',
    example: 1,
  })
  @IsNotEmpty({ message: 'El ID del motivo de incumplimiento es obligatorio' })
  @IsInt({ message: 'El ID del motivo debe ser un número entero' })
  @Min(1, { message: 'El ID del motivo debe ser mayor a 0' })
  reason_id: number;

  @ApiPropertyOptional({
    description: 'Detalle o justificación explicativa del por qué no se completó la actividad (HU-19)',
    example: 'Tuve una reunión de trabajo imprevista y no alcancé a realizar la actividad.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'El detalle debe ser una cadena de texto' })
  @MaxLength(1000, { message: 'El detalle no puede superar los 1000 caracteres' })
  details?: string;

  @ApiPropertyOptional({
    description: 'ID de la versión específica de cronograma. Si no se envía, se asocia automáticamente a la programación vigente de la actividad.',
    example: 2,
  })
  @IsOptional()
  @IsInt({ message: 'El ID del cronograma debe ser un número entero' })
  schedule_id?: number;
}
