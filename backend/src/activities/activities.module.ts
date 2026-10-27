import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from './entities/activity.entity';
import { Stage } from '../stages/entities/stage.entity';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Activity, Stage])],
  providers: [ActivitiesService],
  controllers: [ActivitiesController],
  exports: [TypeOrmModule, ActivitiesService],
})
export class ActivitiesModule {}
