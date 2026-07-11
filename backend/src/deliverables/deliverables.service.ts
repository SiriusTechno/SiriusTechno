import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliverableType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisGenerationService } from './analysis-generation.service';
import { renderAnalysisMarkdown } from './analysis-markdown';

@Injectable()
export class DeliverablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisGeneration: AnalysisGenerationService,
  ) {}

  private async assertOwnedTender(userId: string, tenderId: string) {
    const tender = await this.prisma.tender.findUnique({
      where: { id: tenderId },
      include: { profile: true },
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
   * Génère le document d'analyse du profil (spec 7.1) à partir du dernier
   * rapport de matching. Les écarts ne sont jamais masqués (spec 7.2).
   */
  async generateAnalysis(userId: string, tenderId: string) {
    const tender = await this.assertOwnedTender(userId, tenderId);

    const report = await this.prisma.matchingReport.findFirst({
      where: { tenderId },
      orderBy: { createdAt: 'desc' },
    });
    if (!report) {
      throw new BadRequestException(
        "Lancez d'abord le matching (POST /tenders/:id/matching) avant de générer l'analyse",
      );
    }

    const doc = await this.analysisGeneration.generate(
      tender.title ?? "Appel d'offres sans titre",
      tender.profile.legalName,
      report.data as Record<string, unknown>,
    );

    return this.prisma.deliverable.create({
      data: {
        tenderId,
        type: DeliverableType.ANALYSIS,
        matchingReportId: report.id,
        createdById: userId,
        model: this.analysisGeneration.model,
        content: doc as unknown as Prisma.InputJsonValue,
        markdown: renderAnalysisMarkdown(doc),
      },
    });
  }

  async findAll(userId: string, tenderId: string) {
    await this.assertOwnedTender(userId, tenderId);
    return this.prisma.deliverable.findMany({
      where: { tenderId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        model: true,
        matchingReportId: true,
        createdAt: true,
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async findOne(userId: string, tenderId: string, deliverableId: string) {
    await this.assertOwnedTender(userId, tenderId);
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!deliverable || deliverable.tenderId !== tenderId) {
      throw new NotFoundException('Livrable introuvable');
    }
    return deliverable;
  }
}
