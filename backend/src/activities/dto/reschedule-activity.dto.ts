import { IsDateString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class RescheduleActivityDto {
  @IsNotEmpty({ message: 'La nueva fecha programada es obligatoria' })
  @IsDateString({}, { message: 'La fecha programada debe tener formato YYYY-MM-DD' })
  scheduled_date: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de inicio debe tener formato HH:mm o HH:mm:ss',
  })
  start_time?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de fin debe tener formato HH:mm o HH:mm:ss',
  })
  end_time?: string;
}
