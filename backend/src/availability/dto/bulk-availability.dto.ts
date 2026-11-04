import { IsArray, IsIn, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAvailabilityDto } from './create-availability.dto';

export class BulkAvailabilityDto {
  @ApiProperty({
    type: [CreateAvailabilityDto],
    description: 'Lista completa de franjas horarias semanales para configurar la rutina del usuario',
  })
  @IsArray({ message: 'Las disponibilidades deben ser enviadas en un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityDto)
  availabilities: CreateAvailabilityDto[];

  @ApiPropertyOptional({
    enum: [30, 60, 120],
    description: 'Duración de sesión elegida por el usuario, en minutos',
  })
  @IsOptional()
  @IsInt()
  @IsIn([30, 60, 120])
  session_duration_minutes?: number;
}
