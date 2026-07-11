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
  AddProjectPhotoDto,
  CreateProjectDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { ProjectsService } from './projects.service';

@Controller('profiles/:profileId/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: CreateProjectDto,
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
    @Body() dto: UpdateProjectDto,
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

  @Post(':id/photos')
  addPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddProjectPhotoDto,
  ) {
    return this.service.addPhoto(user.userId, profileId, id, dto);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(204)
  removePhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.service.removePhoto(user.userId, profileId, id, photoId);
  }
}
