import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfileSection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDiplomaDto,
  CreatePersonnelCertificationDto,
  CreatePersonnelDto,
  UpdatePersonnelDto,
} from './dto/personnel.dto';
import { ProfilesService } from './profiles.service';

@Injectable()
export class PersonnelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
  ) {}

  private async assertInProfile(profileId: string, id: string) {
    const member = await this.prisma.personnelMember.findUnique({
      where: { id },
    });
    if (!member || member.profileId !== profileId) {
      throw new NotFoundException('Membre du personnel introuvable');
    }
    return member;
  }

  async create(userId: string, profileId: string, dto: CreatePersonnelDto) {
    await this.profiles.assertOwnership(profileId, userId);
    const member = await this.prisma.personnelMember.create({
      data: { profileId, ...dto },
    });
    await this.profiles.touchSection(profileId, ProfileSection.PERSONNEL);
    await this.profiles.logChange(
      profileId,
      userId,
      ProfileSection.PERSONNEL,
      'add-member',
      { name: `${dto.firstName} ${dto.lastName}`, position: dto.position },
    );
    return member;
  }

  async findAll(userId: string, profileId: string) {
    await this.profiles.assertOwnership(profileId, userId);
    return this.prisma.personnelMember.findMany({
      where: { profileId },
      include: {
        photoFile: true,
        cvFile: true,
        diplomas: { include: { file: true } },
        certifications: { include: { file: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async update(
    userId: string,
    profileId: string,
    id: string,
    dto: UpdatePersonnelDto,
  ) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, id);
    const member = await this.prisma.personnelMember.update({
      where: { id },
      data: dto,
    });
    await this.profiles.touchSection(profileId, ProfileSection.PERSONNEL);
    return member;
  }

  async remove(userId: string, profileId: string, id: string) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, id);
    await this.prisma.personnelMember.delete({ where: { id } });
    await this.profiles.logChange(
      profileId,
      userId,
      ProfileSection.PERSONNEL,
      'delete-member',
      { id },
    );
  }

  async addDiploma(
    userId: string,
    profileId: string,
    personnelId: string,
    dto: CreateDiplomaDto,
  ) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, personnelId);
    return this.prisma.diploma.create({
      data: { personnelId, ...dto },
      include: { file: true },
    });
  }

  async removeDiploma(
    userId: string,
    profileId: string,
    personnelId: string,
    diplomaId: string,
  ) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, personnelId);
    const diploma = await this.prisma.diploma.findUnique({
      where: { id: diplomaId },
    });
    if (!diploma || diploma.personnelId !== personnelId) {
      throw new NotFoundException('Diplôme introuvable');
    }
    await this.prisma.diploma.delete({ where: { id: diplomaId } });
  }

  async addCertification(
    userId: string,
    profileId: string,
    personnelId: string,
    dto: CreatePersonnelCertificationDto,
  ) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, personnelId);
    return this.prisma.personnelCertification.create({
      data: { personnelId, ...dto },
      include: { file: true },
    });
  }

  async removeCertification(
    userId: string,
    profileId: string,
    personnelId: string,
    certificationId: string,
  ) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, personnelId);
    const cert = await this.prisma.personnelCertification.findUnique({
      where: { id: certificationId },
    });
    if (!cert || cert.personnelId !== personnelId) {
      throw new NotFoundException('Certification introuvable');
    }
    await this.prisma.personnelCertification.delete({
      where: { id: certificationId },
    });
  }
}
