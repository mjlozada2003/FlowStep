import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stage } from './entities/stage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stage])],
  exports: [TypeOrmModule],
})
export class StagesModule {}
