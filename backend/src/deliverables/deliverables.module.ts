import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { AnalysisGenerationService } from './analysis-generation.service';
import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';
import { DocxExportService } from './docx-export.service';
import { TechnicalGenerationService } from './technical-generation.service';

@Module({
  imports: [MailModule],
  controllers: [DeliverablesController],
  providers: [
    DeliverablesService,
    AnalysisGenerationService,
    TechnicalGenerationService,
    DocxExportService,
  ],
})
export class DeliverablesModule {}
