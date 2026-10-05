import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stage } from './entities/stage.entity';
import { StagesService } from './stages.service';
import { StagesController } from './stages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Stage])],
  providers: [StagesService],
  controllers: [StagesController],
  exports: [TypeOrmModule, StagesService],
})
export class StagesModule {}
