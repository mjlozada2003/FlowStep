import { IsOptional, IsInt, IsString, IsIn, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityHistoryFilterDto {
  @ApiPropertyOptional({
    description: 'Filtrar eventos por ID de objetivo',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El goal_id debe ser un número entero' })
  goal_id?: number;

  @ApiPropertyOptional({
    description: 'Filtrar eventos por ID de actividad específica',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El activity_id debe ser un número entero' })
  activity_id?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de evento en la cronología',
    enum: ['work_session', 'status_change', 'schedule_version', 'schedule_miss'],
    example: 'work_session',
  })
  @IsOptional()
  @IsString({ message: 'El event_type debe ser una cadena de texto' })
  @IsIn(['work_session', 'status_change', 'schedule_version', 'schedule_miss'], {
    message: 'El event_type debe ser work_session, status_change, schedule_version o schedule_miss',
  })
  event_type?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango (formato YYYY-MM-DD)',
    example: '2026-11-01',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha inicial debe tener formato YYYY-MM-DD',
  })
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango (formato YYYY-MM-DD)',
    example: '2026-11-30',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha final debe tener formato YYYY-MM-DD',
  })
  to?: string;

  @ApiPropertyOptional({
    description: 'Límite de resultados a retornar para paginación (por defecto 50)',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'El límite debe ser de al menos 1' })
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Desplazamiento para paginación (por defecto 0)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El desplazamiento no puede ser negativo' })
  offset?: number = 0;
}
