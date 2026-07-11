import { Module } from '@nestjs/common';
import { CertificationsController } from './certifications.controller';
import { CertificationsService } from './certifications.service';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { FinancialYearsController } from './financial-years.controller';
import { FinancialYearsService } from './financial-years.service';
import { PersonnelController } from './personnel.controller';
import { PersonnelService } from './personnel.service';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [
    ProfilesController,
    CertificationsController,
    FinancialYearsController,
    ProjectsController,
    PersonnelController,
    EquipmentController,
  ],
  providers: [
    ProfilesService,
    CertificationsService,
    FinancialYearsService,
    ProjectsService,
    PersonnelService,
    EquipmentService,
  ],
  exports: [ProfilesService],
})
export class ProfilesModule {}
