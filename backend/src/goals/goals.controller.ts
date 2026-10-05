import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('goals')
@UseGuards(JwtAuthGuard) // Protege todas las rutas de este controlador
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(@Request() req, @Body() createGoalDto: CreateGoalDto) {
    // req.user viene del JwtStrategy (contiene userId)
    return this.goalsService.create(req.user.userId, createGoalDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.goalsService.findAllByUser(req.user.userId);
  }
}
