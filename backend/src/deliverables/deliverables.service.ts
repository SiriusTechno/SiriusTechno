import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliverableType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisDocument } from './analysis-document.schema';
import { AnalysisGenerationService } from './analysis-generation.service';
import { renderAnalysisMarkdown } from './analysis-markdown';
import { DocxExportService } from './docx-export.service';
import { renderTechnicalMarkdown } from './technical-markdown';
import { TechnicalGenerationService } from './technical-generation.service';
import { TechnicalProposal } from './technical-proposal.schema';

interface RequirementLike {
  requirement: string;
  status: string;
}

@Injectable()
export class DeliverablesService {
  /** Relecture obligatoire avant export Word ? (spec 11, recommandé : oui) */
  private readonly requireReviewBeforeExport: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisGeneration: AnalysisGenerationService,
    private readonly technicalGeneration: TechnicalGenerationService,
    private readonly docxExport: DocxExportService,
    config: ConfigService,
  ) {
    this.requireReviewBeforeExport =
      config.get('REQUIRE_REVIEW_BEFORE_EXPORT') === 'true';
  }

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

  /** Écarts (PARTIAL / NOT_COVERED) du rapport de matching. */
  extractGaps(matchingData: Record<string, unknown>): RequirementLike[] {
    const requirements = (matchingData.requirements ??
      []) as RequirementLike[];
    return requirements.filter(
      (r) => r.status === 'PARTIAL' || r.status === 'NOT_COVERED',
    );
  }

  /**
   * Génère la proposition technique (spec 7.2). Les écarts non couverts sont
   * signalés AVANT génération : refus explicite tant que l'utilisateur ne les
   * a pas pris en compte (acknowledgeGaps).
   */
  async generateTechnical(
    userId: string,
    tenderId: string,
    acknowledgeGaps: boolean,
  ) {
    const tender = await this.assertOwnedTender(userId, tenderId);

    const report = await this.prisma.matchingReport.findFirst({
      where: { tenderId },
      orderBy: { createdAt: 'desc' },
    });
    if (!report) {
      throw new BadRequestException(
        "Lancez d'abord le matching (POST /tenders/:id/matching) avant de générer la proposition technique",
      );
    }

    const matchingData = report.data as Record<string, unknown>;
    const gaps = this.extractGaps(matchingData);
    if (gaps.length > 0 && !acknowledgeGaps) {
      throw new ConflictException({
        message: `${gaps.length} exigence(s) non couverte(s) ou partiellement couverte(s). Vérifiez ces écarts puis relancez avec acknowledgeGaps=true pour générer malgré tout.`,
        gaps: gaps.map((g) => ({
          requirement: g.requirement,
          status: g.status,
        })),
      });
    }

    const doc = await this.technicalGeneration.generate({
      tenderTitle: tender.title ?? "Appel d'offres sans titre",
      companyName: tender.profile.legalName,
      grid: report.gridSnapshot as Record<string, unknown>,
      profileSnapshot: report.profileSnapshot as Record<string, unknown>,
      matchingData,
    });

    return this.prisma.deliverable.create({
      data: {
        tenderId,
        type: DeliverableType.TECHNICAL_PROPOSAL,
        matchingReportId: report.id,
        createdById: userId,
        model: this.technicalGeneration.model,
        content: doc as unknown as Prisma.InputJsonValue,
        markdown: renderTechnicalMarkdown(doc),
      },
    });
  }

  /** Relecture (spec 8) : correction du contenu — le Markdown est re-rendu. */
  async update(
    userId: string,
    tenderId: string,
    deliverableId: string,
    content: Record<string, unknown>,
  ) {
    const deliverable = await this.findOne(userId, tenderId, deliverableId);
    const markdown =
      deliverable.type === DeliverableType.ANALYSIS
        ? renderAnalysisMarkdown(content as unknown as AnalysisDocument)
        : renderTechnicalMarkdown(content as unknown as TechnicalProposal);

    return this.prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        content: content as Prisma.InputJsonValue,
        markdown,
        editedByUser: true,
        reviewedAt: null, // toute édition invalide la validation précédente
      },
    });
  }

  /** Validation de relecture (spec 8). */
  async review(userId: string, tenderId: string, deliverableId: string) {
    await this.findOne(userId, tenderId, deliverableId);
    return this.prisma.deliverable.update({
      where: { id: deliverableId },
      data: { reviewedAt: new Date() },
    });
  }

  /** Export Word (spec 8). */
  async exportDocx(
    userId: string,
    tenderId: string,
    deliverableId: string,
  ): Promise<{ filename: string; buffer: Buffer; reviewed: boolean }> {
    const deliverable = await this.findOne(userId, tenderId, deliverableId);
    if (this.requireReviewBeforeExport && !deliverable.reviewedAt) {
      throw new ConflictException(
        "Ce document doit être relu et validé avant l'export (POST .../review)",
      );
    }
    const tender = await this.prisma.tender.findUniqueOrThrow({
      where: { id: tenderId },
      include: { profile: true },
    });

    const buffer =
      deliverable.type === DeliverableType.ANALYSIS
        ? await this.docxExport.renderAnalysis(
            deliverable.content as unknown as AnalysisDocument,
            tender.profile.legalName,
          )
        : await this.docxExport.renderTechnical(
            deliverable.content as unknown as TechnicalProposal,
            tender.profile.legalName,
          );

    const slug =
      deliverable.type === DeliverableType.ANALYSIS
        ? 'analyse'
        : 'proposition-technique';
    return {
      filename: `${slug}-${deliverableId.slice(0, 8)}.docx`,
      buffer,
      reviewed: !!deliverable.reviewedAt,
    };
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
