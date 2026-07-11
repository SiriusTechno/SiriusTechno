import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfileSection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddProjectPhotoDto,
  CreateProjectDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { ProfilesService } from './profiles.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
  ) {}

  private async assertInProfile(profileId: string, id: string) {
    const project = await this.prisma.referenceProject.findUnique({
      where: { id },
    });
    if (!project || project.profileId !== profileId) {
      throw new NotFoundException('Projet introuvable');
    }
    return project;
  }

  async create(userId: string, profileId: string, dto: CreateProjectDto) {
    await this.profiles.assertOwnership(profileId, userId);
    const project = await this.prisma.referenceProject.create({
      data: { profileId, ...dto },
    });
    await this.profiles.touchSection(profileId, ProfileSection.EXPERIENCE);
    await this.profiles.logChange(
      profileId,
      userId,
      ProfileSection.EXPERIENCE,
      'add-project',
      { title: dto.title },
    );
    return project;
  }

  async findAll(userId: string, profileId: string) {
    await this.profiles.assertOwnership(profileId, userId);
    return this.prisma.referenceProject.findMany({
      where: { profileId },
      include: {
        photos: { include: { file: true } },
        finalAcceptanceFile: true,
        goodExecutionFile: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async update(
    userId: string,
    profileId: string,
    id: string,
    dto: UpdateProjectDto,
  ) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, id);
    const project = await this.prisma.referenceProject.update({
      where: { id },
      data: dto,
    });
    await this.profiles.touchSection(profileId, ProfileSection.EXPERIENCE);
    return project;
  }

  async remove(userId: string, profileId: string, id: string) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, id);
    await this.prisma.referenceProject.delete({ where: { id } });
    await this.profiles.logChange(
      profileId,
      userId,
      ProfileSection.EXPERIENCE,
      'delete-project',
      { id },
    );
  }

  async addPhoto(
    userId: string,
    profileId: string,
    projectId: string,
    dto: AddProjectPhotoDto,
  ) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, projectId);
    return this.prisma.projectPhoto.create({
      data: { projectId, fileId: dto.fileId, caption: dto.caption },
      include: { file: true },
    });
  }

  async removePhoto(
    userId: string,
    profileId: string,
    projectId: string,
    photoId: string,
  ) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, projectId);
    const photo = await this.prisma.projectPhoto.findUnique({
      where: { id: photoId },
    });
    if (!photo || photo.projectId !== projectId) {
      throw new NotFoundException('Photo introuvable');
    }
    await this.prisma.projectPhoto.delete({ where: { id: photoId } });
  }
}
