import { IsEnum, IsNotEmpty, Matches } from 'class-validator';
import { DayOfWeek } from '../enums/day-of-week.enum';

export class CreateAvailabilityDto {
  @IsNotEmpty({ message: 'El día de la semana es obligatorio' })
  @IsEnum(DayOfWeek, {
    message: 'El día debe ser: monday, tuesday, wednesday, thursday, friday, saturday o sunday',
  })
  day_of_week: DayOfWeek;

  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de inicio debe tener formato HH:mm o HH:mm:ss (ej. 09:00 o 18:30)',
  })
  start_time: string;

  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de fin debe tener formato HH:mm o HH:mm:ss (ej. 10:00 o 20:30)',
  })
  end_time: string;
}
