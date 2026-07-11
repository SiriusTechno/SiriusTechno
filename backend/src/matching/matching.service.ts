import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingAnalysisService } from './matching-analysis.service';
import { MatchingResult, RequirementMatch } from './matching.schema';
import { ProfileSnapshotService } from './profile-snapshot.service';

export interface MatchingSummary {
  total: number;
  covered: number;
  partial: number;
  notCovered: number;
  /** IDs retournés par le LLM mais absents du profil (retirés du rapport). */
  invalidElementIdsRemoved: number;
}

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshots: ProfileSnapshotService,
    private readonly analysis: MatchingAnalysisService,
  ) {}

  private async assertOwnedTender(userId: string, tenderId: string) {
    const tender = await this.prisma.tender.findUnique({
      where: { id: tenderId },
      include: { profile: true, grid: true },
    });
    if (!tender) {
      throw new NotFoundException("Appel d'offres introuvable");
    }
    if (tender.profile.ownerId !== userId) {
      throw new ForbiddenException("Accès refusé à cet appel d'offres");
    }
    return tender;
  }

  /**
   * Garde-fou anti-hallucination (spec 6) : tout élément cité par le LLM
   * dont l'ID n'existe pas dans le profil est retiré ; si une exigence
   * COVERED perd tous ses éléments, elle est requalifiée NOT_COVERED.
   */
  sanitize(
    result: MatchingResult,
    validIds: Set<string>,
  ): { requirements: RequirementMatch[]; removed: number } {
    let removed = 0;
    const requirements = result.requirements.map((req) => {
      const matchedElements = req.matchedElements.filter((el) => {
        const valid = validIds.has(el.id);
        if (!valid) removed++;
        return valid;
      });
      let status = req.status;
      if (matchedElements.length === 0 && status !== 'NOT_COVERED') {
        status = 'NOT_COVERED';
      }
      return { ...req, matchedElements, status };
    });
    return { requirements, removed };
  }

  private summarize(
    requirements: RequirementMatch[],
    removed: number,
  ): MatchingSummary {
    return {
      total: requirements.length,
      covered: requirements.filter((r) => r.status === 'COVERED').length,
      partial: requirements.filter((r) => r.status === 'PARTIAL').length,
      notCovered: requirements.filter((r) => r.status === 'NOT_COVERED')
        .length,
      invalidElementIdsRemoved: removed,
    };
  }

  /** Lance le matching (spec 6) et enregistre un rapport traçable (spec 10). */
  async run(userId: string, tenderId: string) {
    const tender = await this.assertOwnedTender(userId, tenderId);
    if (tender.status !== TenderStatus.GRID_READY || !tender.grid) {
      throw new BadRequestException(
        "La grille de conformité doit être générée (et éventuellement corrigée) avant le matching",
      );
    }

    const snapshot = await this.snapshots.build(tender.profileId);
    const grid = tender.grid.data as Record<string, unknown>;

    const raw = await this.analysis.match(grid, snapshot);
    const { requirements, removed } = this.sanitize(
      raw,
      new Set(snapshot.validElementIds),
    );
    const summary = this.summarize(requirements, removed);

    const { validElementIds: _ids, ...profileSnapshot } = snapshot;

    return this.prisma.matchingReport.create({
      data: {
        tenderId,
        createdById: userId,
        data: { requirements, summary } as unknown as Prisma.InputJsonValue,
        gridSnapshot: grid as Prisma.InputJsonValue,
        profileSnapshot: profileSnapshot as unknown as Prisma.InputJsonValue,
        model: this.analysis.model,
      },
    });
  }

  /** Dernier rapport de matching de l'AO. */
  async latest(userId: string, tenderId: string) {
    await this.assertOwnedTender(userId, tenderId);
    const report = await this.prisma.matchingReport.findFirst({
      where: { tenderId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!report) {
      throw new NotFoundException(
        "Aucun matching n'a encore été lancé pour cet appel d'offres",
      );
    }
    return report;
  }

  /** Historique des rapports (le profil évolue, le matching se rejoue). */
  async history(userId: string, tenderId: string) {
    await this.assertOwnedTender(userId, tenderId);
    return this.prisma.matchingReport.findMany({
      where: { tenderId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        model: true,
        createdAt: true,
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async findOne(userId: string, tenderId: string, reportId: string) {
    await this.assertOwnedTender(userId, tenderId);
    const report = await this.prisma.matchingReport.findUnique({
      where: { id: reportId },
      include: {
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!report || report.tenderId !== tenderId) {
      throw new NotFoundException('Rapport de matching introuvable');
    }
    return report;
  }
}
