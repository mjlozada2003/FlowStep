import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { BulkAvailabilityDto } from './dto/bulk-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  create(@Request() req: any, @Body() createDto: CreateAvailabilityDto) {
    return this.availabilityService.create(req.user.userId, createDto);
  }

  @Post('bulk')
  bulkSet(@Request() req: any, @Body() bulkDto: BulkAvailabilityDto) {
    return this.availabilityService.bulkSet(req.user.userId, bulkDto.availabilities);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.availabilityService.findAllByUser(req.user.userId);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.availabilityService.remove(req.user.userId, id);
  }
}
