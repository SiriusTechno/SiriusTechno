import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfileSection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertFinancialYearDto } from './dto/financial-year.dto';
import { ProfilesService } from './profiles.service';

/**
 * Données financières versionnées (spec 4.1.B) : chaque mise à jour d'un
 * exercice crée une nouvelle version et démarque l'ancienne (isCurrent=false).
 * Aucune valeur n'est jamais écrasée.
 */
@Injectable()
export class FinancialYearsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
  ) {}

  async upsert(userId: string, profileId: string, dto: UpsertFinancialYearDto) {
    await this.profiles.assertOwnership(profileId, userId);

    const created = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.financialYear.findFirst({
        where: { profileId, fiscalYear: dto.fiscalYear },
        orderBy: { version: 'desc' },
      });
      if (latest) {
        await tx.financialYear.updateMany({
          where: { profileId, fiscalYear: dto.fiscalYear, isCurrent: true },
          data: { isCurrent: false },
        });
      }
      return tx.financialYear.create({
        data: {
          profileId,
          fiscalYear: dto.fiscalYear,
          revenue: dto.revenue,
          currency: dto.currency ?? 'XOF',
          balanceSheetFileId: dto.balanceSheetFileId,
          bankAttestationFileId: dto.bankAttestationFileId,
          taxClearanceFileId: dto.taxClearanceFileId,
          version: (latest?.version ?? 0) + 1,
          isCurrent: true,
        },
      });
    });

    await this.profiles.touchSection(profileId, ProfileSection.FINANCES);
    await this.profiles.logChange(
      profileId,
      userId,
      ProfileSection.FINANCES,
      created.version === 1 ? 'create' : 'new-version',
      { fiscalYear: dto.fiscalYear, version: created.version },
    );
    return created;
  }

  /** Versions courantes de chaque exercice. */
  async findCurrent(userId: string, profileId: string) {
    await this.profiles.assertOwnership(profileId, userId);
    return this.prisma.financialYear.findMany({
      where: { profileId, isCurrent: true },
      orderBy: { fiscalYear: 'desc' },
      include: {
        balanceSheetFile: true,
        bankAttestationFile: true,
        taxClearanceFile: true,
      },
    });
  }

  /** Historique complet des versions d'un exercice. */
  async history(userId: string, profileId: string, fiscalYear: number) {
    await this.profiles.assertOwnership(profileId, userId);
    const versions = await this.prisma.financialYear.findMany({
      where: { profileId, fiscalYear },
      orderBy: { version: 'desc' },
      include: {
        balanceSheetFile: true,
        bankAttestationFile: true,
        taxClearanceFile: true,
      },
    });
    if (versions.length === 0) {
      throw new NotFoundException(
        `Aucune donnée pour l'exercice ${fiscalYear}`,
      );
    }
    return versions;
  }
}
