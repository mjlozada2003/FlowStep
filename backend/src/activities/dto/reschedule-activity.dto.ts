import { IsDateString, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RescheduleActivityDto {
  @ApiProperty({
    example: '2026-11-15',
    description: 'Nueva fecha programada para la actividad (formato YYYY-MM-DD)',
  })
  @IsNotEmpty({ message: 'La nueva fecha programada es obligatoria' })
  @IsDateString({}, { message: 'La fecha programada debe tener formato YYYY-MM-DD' })
  scheduled_date: string;

  @ApiPropertyOptional({
    example: '15:00',
    description: 'Hora de inicio programada en formato HH:mm o HH:mm:ss',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de inicio debe tener formato HH:mm o HH:mm:ss',
  })
  start_time?: string;

  @ApiPropertyOptional({
    example: '16:30',
    description: 'Hora de fin programada en formato HH:mm o HH:mm:ss',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de fin debe tener formato HH:mm o HH:mm:ss',
  })
  end_time?: string;
}
