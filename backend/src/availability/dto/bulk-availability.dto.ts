import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
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
}
