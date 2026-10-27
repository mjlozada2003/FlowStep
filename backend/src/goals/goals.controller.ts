import { Controller, Post, Get, Patch, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalPriorityDto } from './dto/update-goal-priority.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(@Request() req: any, @Body() createGoalDto: CreateGoalDto) {
    return this.goalsService.create(req.user.userId, createGoalDto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.goalsService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.goalsService.findOneByUser(req.user.userId, id);
  }

  @Patch(':id/priority')
  updatePriority(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGoalPriorityDto: UpdateGoalPriorityDto,
  ) {
    return this.goalsService.updatePriority(req.user.userId, id, updateGoalPriorityDto.priority);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    return this.goalsService.update(req.user.userId, id, updateGoalDto);
  }
}
