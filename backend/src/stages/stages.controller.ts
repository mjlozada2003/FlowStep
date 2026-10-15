import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StagesService } from './stages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Etapas')
@ApiBearerAuth('JWT-auth')
@Controller('stages')
@UseGuards(JwtAuthGuard)
export class StagesController {
  constructor(private readonly stagesService: StagesService) {}

  @Get(':id/activities')
  @ApiOperation({
    summary: 'Consultar actividades ordenadas de una etapa (HU-10)',
    description: 'Retorna la lista de actividades asociadas a una etapa específica ordenadas según su orden de ejecución.',
  })
  @ApiParam({ name: 'id', description: 'ID de la etapa', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Lista de actividades de la etapa recuperada con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado. Se requiere un token Bearer válido.',
  })
  getActivitiesByStage(@Param('id', ParseIntPipe) id: number) {
    return this.stagesService.getActivitiesByStage(id);
  }
}
