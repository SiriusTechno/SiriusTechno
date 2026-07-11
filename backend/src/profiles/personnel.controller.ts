import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateDiplomaDto,
  CreatePersonnelCertificationDto,
  CreatePersonnelDto,
  UpdatePersonnelDto,
} from './dto/personnel.dto';
import { PersonnelService } from './personnel.service';

@Controller('profiles/:profileId/personnel')
@UseGuards(JwtAuthGuard)
export class PersonnelController {
  constructor(private readonly service: PersonnelService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: CreatePersonnelDto,
  ) {
    return this.service.create(user.userId, profileId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.service.findAll(user.userId, profileId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonnelDto,
  ) {
    return this.service.update(user.userId, profileId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user.userId, profileId, id);
  }

  @Post(':id/diplomas')
  addDiploma(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDiplomaDto,
  ) {
    return this.service.addDiploma(user.userId, profileId, id, dto);
  }

  @Delete(':id/diplomas/:diplomaId')
  @HttpCode(204)
  removeDiploma(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('diplomaId', ParseUUIDPipe) diplomaId: string,
  ) {
    return this.service.removeDiploma(user.userId, profileId, id, diplomaId);
  }

  @Post(':id/certifications')
  addCertification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePersonnelCertificationDto,
  ) {
    return this.service.addCertification(user.userId, profileId, id, dto);
  }

  @Delete(':id/certifications/:certificationId')
  @HttpCode(204)
  removeCertification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('certificationId', ParseUUIDPipe) certificationId: string,
  ) {
    return this.service.removeCertification(
      user.userId,
      profileId,
      id,
      certificationId,
    );
  }
}
