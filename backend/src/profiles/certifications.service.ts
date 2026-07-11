import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfileSection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateIsoCertificationDto,
  UpdateIsoCertificationDto,
} from './dto/certification.dto';
import { ProfilesService } from './profiles.service';

@Injectable()
export class CertificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
  ) {}

  private async assertInProfile(profileId: string, id: string) {
    const cert = await this.prisma.isoCertification.findUnique({
      where: { id },
    });
    if (!cert || cert.profileId !== profileId) {
      throw new NotFoundException('Certification introuvable');
    }
    return cert;
  }

  async create(
    userId: string,
    profileId: string,
    dto: CreateIsoCertificationDto,
  ) {
    await this.profiles.assertOwnership(profileId, userId);
    const cert = await this.prisma.isoCertification.create({
      data: { profileId, ...dto },
    });
    await this.profiles.touchSection(profileId, ProfileSection.IDENTITY);
    await this.profiles.logChange(
      profileId,
      userId,
      ProfileSection.IDENTITY,
      'add-certification',
      { name: dto.name },
    );
    return cert;
  }

  async findAll(userId: string, profileId: string) {
    await this.profiles.assertOwnership(profileId, userId);
    return this.prisma.isoCertification.findMany({
      where: { profileId },
      include: { certificateFile: true },
    });
  }

  async update(
    userId: string,
    profileId: string,
    id: string,
    dto: UpdateIsoCertificationDto,
  ) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, id);
    const cert = await this.prisma.isoCertification.update({
      where: { id },
      data: dto,
    });
    await this.profiles.touchSection(profileId, ProfileSection.IDENTITY);
    return cert;
  }

  async remove(userId: string, profileId: string, id: string) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, id);
    await this.prisma.isoCertification.delete({ where: { id } });
    await this.profiles.logChange(
      profileId,
      userId,
      ProfileSection.IDENTITY,
      'delete-certification',
      { id },
    );
  }
}
