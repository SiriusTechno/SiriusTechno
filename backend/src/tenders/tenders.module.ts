import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { StorageService } from '../files/storage/storage.service';
import { ProfilesModule } from '../profiles/profiles.module';
import { GridAnalysisService } from './grid-analysis.service';
import { TendersController } from './tenders.controller';
import { TendersService } from './tenders.service';
import { TextExtractionService } from './text-extraction.service';

@Module({
  imports: [FilesModule, ProfilesModule],
  controllers: [TendersController],
  providers: [
    TendersService,
    TextExtractionService,
    GridAnalysisService,
    StorageService,
  ],
})
export class TendersModule {}
