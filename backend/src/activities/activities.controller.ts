import { Controller, Patch, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Patch(':id/complete')
  completeActivity(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.completeActivity(id);
  }
}
