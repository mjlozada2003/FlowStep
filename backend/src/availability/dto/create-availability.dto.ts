import { IsEnum, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '../enums/day-of-week.enum';

export class CreateAvailabilityDto {
  @ApiProperty({
    example: 'monday',
    enum: DayOfWeek,
    description: 'Día de la semana en que el usuario tiene disponibilidad (HU-35)',
  })
  @IsNotEmpty({ message: 'El día de la semana es obligatorio' })
  @IsEnum(DayOfWeek, {
    message: 'El día debe ser: monday, tuesday, wednesday, thursday, friday, saturday o sunday',
  })
  day_of_week: DayOfWeek;

  @ApiProperty({
    example: '18:00',
    description: 'Hora de inicio disponible en formato HH:mm o HH:mm:ss',
  })
  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de inicio debe tener formato HH:mm o HH:mm:ss (ej. 09:00 o 18:30)',
  })
  start_time: string;

  @ApiProperty({
    example: '20:00',
    description: 'Hora de finalización disponible en formato HH:mm o HH:mm:ss (debe ser posterior a start_time)',
  })
  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de fin debe tener formato HH:mm o HH:mm:ss (ej. 10:00 o 20:30)',
  })
  end_time: string;
}
