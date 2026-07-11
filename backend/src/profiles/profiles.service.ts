import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CompanyProfile,
  Prisma,
  ProfileSection,
  ProfileStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/create-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifie que le profil existe et appartient à l'utilisateur.
   * Utilisé par tous les services de sous-ressources.
   */
  async assertOwnership(
    profileId: string,
    userId: string,
  ): Promise<CompanyProfile> {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) {
      throw new NotFoundException('Profil introuvable');
    }
    if (profile.ownerId !== userId) {
      throw new ForbiddenException('Accès refusé à ce profil');
    }
    return profile;
  }

  /** Journalise une modification (traçabilité, spec 4.2 / 10). */
  async logChange(
    profileId: string,
    userId: string,
    section: ProfileSection,
    action: string,
    details?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.profileChangeLog.create({
      data: { profileId, userId, section, action, details },
    });
  }

  /** Met à jour l'horodatage "dernière mise à jour" de la section. */
  async touchSection(
    profileId: string,
    section: ProfileSection,
  ): Promise<void> {
    const field: Record<ProfileSection, keyof Prisma.CompanyProfileUpdateInput> =
      {
        IDENTITY: 'identityUpdatedAt',
        FINANCES: 'financesUpdatedAt',
        EXPERIENCE: 'experienceUpdatedAt',
        PERSONNEL: 'experienceUpdatedAt', // même section "expérience & personnel" dans la spec
        EQUIPMENT: 'equipmentUpdatedAt',
      };
    await this.prisma.companyProfile.update({
      where: { id: profileId },
      data: { [field[section]]: new Date() },
    });
  }

  async create(userId: string, dto: CreateProfileDto) {
    const profile = await this.prisma.companyProfile.create({
      data: {
        ownerId: userId,
        status: ProfileStatus.DRAFT,
        identityUpdatedAt: new Date(),
        ...dto,
      },
    });
    await this.logChange(profile.id, userId, ProfileSection.IDENTITY, 'create');
    return profile;
  }

  findAll(userId: string) {
    return this.prisma.companyProfile.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /** Profil complet avec toutes ses sections — sert aussi de récapitulatif. */
  async findOne(userId: string, profileId: string) {
    await this.assertOwnership(profileId, userId);
    const profile = await this.prisma.companyProfile.findUnique({
      where: { id: profileId },
      include: {
        logoFile: true,
        isoCertifications: { include: { certificateFile: true } },
        financialYears: {
          where: { isCurrent: true },
          orderBy: { fiscalYear: 'desc' },
          include: {
            balanceSheetFile: true,
            bankAttestationFile: true,
            taxClearanceFile: true,
          },
        },
        projects: {
          include: {
            photos: { include: { file: true } },
            finalAcceptanceFile: true,
            goodExecutionFile: true,
          },
        },
        personnel: {
          include: {
            photoFile: true,
            cvFile: true,
            diplomas: { include: { file: true } },
            certifications: { include: { file: true } },
          },
        },
        equipment: {
          include: { photoFile: true, ownershipProofFile: true },
        },
      },
    });
    // durée calculée des projets (spec 4.1.C)
    return {
      ...profile!,
      projects: profile!.projects.map((p) => ({
        ...p,
        durationDays:
          p.startDate && p.endDate
            ? Math.round(
                (p.endDate.getTime() - p.startDate.getTime()) / 86_400_000,
              )
            : null,
      })),
    };
  }

  async update(userId: string, profileId: string, dto: UpdateProfileDto) {
    await this.assertOwnership(profileId, userId);
    const profile = await this.prisma.companyProfile.update({
      where: { id: profileId },
      data: { ...dto, identityUpdatedAt: new Date() },
    });
    await this.logChange(
      profileId,
      userId,
      ProfileSection.IDENTITY,
      'update',
      { fields: Object.keys(dto) },
    );
    return profile;
  }

  /**
   * Confirmation après récapitulatif (spec 4.2) : passe le profil de
   * DRAFT à ACTIVE. Exige au minimum une raison sociale.
   */
  async confirm(userId: string, profileId: string) {
    const profile = await this.assertOwnership(profileId, userId);
    if (profile.status === ProfileStatus.ACTIVE) {
      throw new BadRequestException('Ce profil est déjà confirmé');
    }
    const updated = await this.prisma.companyProfile.update({
      where: { id: profileId },
      data: { status: ProfileStatus.ACTIVE },
    });
    await this.logChange(profileId, userId, ProfileSection.IDENTITY, 'confirm');
    return updated;
  }

  async archive(userId: string, profileId: string) {
    await this.assertOwnership(profileId, userId);
    const updated = await this.prisma.companyProfile.update({
      where: { id: profileId },
      data: { status: ProfileStatus.ARCHIVED },
    });
    await this.logChange(profileId, userId, ProfileSection.IDENTITY, 'archive');
    return updated;
  }

  /** Historique des modifications du profil. */
  async changeLog(userId: string, profileId: string) {
    await this.assertOwnership(profileId, userId);
    return this.prisma.profileChangeLog.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
  }
}
