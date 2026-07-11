import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfileSection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentDto, UpdateEquipmentDto } from './dto/equipment.dto';
import { ProfilesService } from './profiles.service';

@Injectable()
export class EquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
  ) {}

  private async assertInProfile(profileId: string, id: string) {
    const item = await this.prisma.equipmentItem.findUnique({ where: { id } });
    if (!item || item.profileId !== profileId) {
      throw new NotFoundException('Équipement introuvable');
    }
    return item;
  }

  async create(userId: string, profileId: string, dto: CreateEquipmentDto) {
    await this.profiles.assertOwnership(profileId, userId);
    const item = await this.prisma.equipmentItem.create({
      data: { profileId, ...dto },
    });
    await this.profiles.touchSection(profileId, ProfileSection.EQUIPMENT);
    await this.profiles.logChange(
      profileId,
      userId,
      ProfileSection.EQUIPMENT,
      'add-equipment',
      { type: dto.type },
    );
    return item;
  }

  async findAll(userId: string, profileId: string) {
    await this.profiles.assertOwnership(profileId, userId);
    return this.prisma.equipmentItem.findMany({
      where: { profileId },
      include: { photoFile: true, ownershipProofFile: true },
      orderBy: { type: 'asc' },
    });
  }

  async update(
    userId: string,
    profileId: string,
    id: string,
    dto: UpdateEquipmentDto,
  ) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, id);
    const item = await this.prisma.equipmentItem.update({
      where: { id },
      data: dto,
    });
    await this.profiles.touchSection(profileId, ProfileSection.EQUIPMENT);
    return item;
  }

  async remove(userId: string, profileId: string, id: string) {
    await this.profiles.assertOwnership(profileId, userId);
    await this.assertInProfile(profileId, id);
    await this.prisma.equipmentItem.delete({ where: { id } });
    await this.profiles.logChange(
      profileId,
      userId,
      ProfileSection.EQUIPMENT,
      'delete-equipment',
      { id },
    );
  }
}
