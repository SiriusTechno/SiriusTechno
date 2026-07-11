import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { PriceScheduleController } from './price-schedule.controller';
import { PriceScheduleParserService } from './price-schedule-parser.service';
import { PriceScheduleService } from './price-schedule.service';
import { PriceScheduleTemplateService } from './price-schedule-template.service';

@Module({
  imports: [FilesModule],
  controllers: [PriceScheduleController],
  providers: [
    PriceScheduleService,
    PriceScheduleTemplateService,
    PriceScheduleParserService,
  ],
  exports: [PriceScheduleService],
})
export class PriceScheduleModule {}
