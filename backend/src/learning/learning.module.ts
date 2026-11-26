import { Module } from '@nestjs/common';
import { LearningStoreService } from './learning-store.service';

@Module({
  providers: [LearningStoreService],
  exports: [LearningStoreService],
})
export class LearningModule {}
