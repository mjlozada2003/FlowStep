import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { RescheduleActivityDto } from './dto/reschedule-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(id, updateActivityDto);
  }

  @Patch(':id/complete')
  completeActivity(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.completeActivity(id);
  }

  @Patch(':id/pending')
  markAsPending(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.markAsPending(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.remove(id);
  }

  @Post(':id/reschedule')
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() rescheduleDto: RescheduleActivityDto,
  ) {
    return this.activitiesService.reschedule(id, rescheduleDto);
  }

  @Get(':id/schedules')
  getScheduleHistory(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.getScheduleHistory(id);
  }
}
