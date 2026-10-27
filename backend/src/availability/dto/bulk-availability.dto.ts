import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAvailabilityDto } from './create-availability.dto';

export class BulkAvailabilityDto {
  @IsArray({ message: 'Las disponibilidades deben ser enviadas en un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityDto)
  availabilities: CreateAvailabilityDto[];
}
