import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stage } from './entities/stage.entity';
import { StagesService } from './stages.service';
import { StagesController } from './stages.controller';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [TypeOrmModule.forFeature([Stage]), ActivitiesModule],
  providers: [StagesService],
  controllers: [StagesController],
  exports: [TypeOrmModule, StagesService],
})
export class StagesModule {}
