import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { StagesService } from './stages.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateActivityDto } from '../activities/dto/create-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stages')
@UseGuards(JwtAuthGuard)
export class StagesController {
  constructor(
    private readonly stagesService: StagesService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Get(':id/activities')
  getActivitiesByStage(@Param('id', ParseIntPipe) id: number) {
    return this.stagesService.getActivitiesByStage(id);
  }

  @Post(':id/activities')
  addActivity(
    @Param('id', ParseIntPipe) id: number,
    @Body() createActivityDto: CreateActivityDto,
  ) {
    return this.activitiesService.createForStage(id, createActivityDto);
  }
}
