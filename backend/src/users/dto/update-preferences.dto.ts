import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Activar o desactivar recordatorios de actividades',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  reminders_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Minutos de anticipación para el recordatorio (5, 10, 15, 30, 60, 120)',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @IsIn([5, 10, 15, 30, 60, 120])
  reminder_minutes_before?: number;

  @ApiPropertyOptional({
    description: 'Activar o desactivar alertas de retraso',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  delay_alerts_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Activar o desactivar resumen periódico semanal',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  periodic_summary_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Criterio de ordenación por defecto de objetivos',
    enum: ['priority', 'due_date', 'progress', 'created_at'],
    example: 'priority',
  })
  @IsOptional()
  @IsString()
  @IsIn(['priority', 'due_date', 'progress', 'created_at'])
  goals_sort_by?: string;

  @ApiPropertyOptional({
    description: 'Zona horaria oficial del usuario (ej: America/La_Paz)',
    example: 'America/La_Paz',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Duración de sesión de trabajo en minutos (Sprint 2)',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  session_duration_minutes?: number;
}
