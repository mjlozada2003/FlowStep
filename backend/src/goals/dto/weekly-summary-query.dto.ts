import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class WeeklySummaryQueryDto {
  @ApiPropertyOptional({
    description: 'Fecha de inicio del período de resumen (formato YYYY-MM-DD)',
    example: '2026-11-05',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del período de resumen (formato YYYY-MM-DD)',
    example: '2026-11-12',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
