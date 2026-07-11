import { Module } from '@nestjs/common';
import { MatchingAnalysisService } from './matching-analysis.service';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { ProfileSnapshotService } from './profile-snapshot.service';

@Module({
  controllers: [MatchingController],
  providers: [MatchingService, MatchingAnalysisService, ProfileSnapshotService],
  exports: [MatchingService],
})
export class MatchingModule {}
