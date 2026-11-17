import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class AddReinforcementDto {
  @ApiProperty({
    description: 'Tema o concepto que requiere refuerzo (HU-42)',
    example: 'Hooks y estado en React',
  })
  @IsNotEmpty({ message: 'El tema de refuerzo es obligatorio' })
  @IsString()
  topic: string;

  @ApiPropertyOptional({
    description: 'Título personalizado de la actividad de refuerzo',
    example: 'Refuerzo guiado: Hooks y estado en React',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'ID de la etapa donde se incorporará la actividad',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  stage_id?: number;

  @ApiPropertyOptional({
    description: 'Minutos estimados para la actividad de refuerzo',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(180)
  estimated_minutes?: number;
}
