import { Module } from '@nestjs/common';
import { AnalysisGenerationService } from './analysis-generation.service';
import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';

@Module({
  controllers: [DeliverablesController],
  providers: [DeliverablesService, AnalysisGenerationService],
})
export class DeliverablesModule {}
