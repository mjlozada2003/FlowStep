import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class GoalQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado del objetivo',
    enum: ['active', 'paused', 'completed', 'archived', 'all'],
    example: 'active',
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused', 'completed', 'archived', 'all'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Criterio de ordenamiento',
    enum: ['priority', 'due_date', 'created_at'],
    example: 'priority',
  })
  @IsOptional()
  @IsString()
  @IsIn(['priority', 'due_date', 'created_at'])
  sortBy?: string;
}
