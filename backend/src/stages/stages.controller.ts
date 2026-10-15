import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { StagesService } from './stages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stages')
@UseGuards(JwtAuthGuard)
export class StagesController {
  constructor(private readonly stagesService: StagesService) {}

  @Get(':id/activities')
  getActivitiesByStage(@Param('id', ParseIntPipe) id: number) {
    return this.stagesService.getActivitiesByStage(id);
  }
}
