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
import {
  buildCommercialProposal,
  CommercialItem,
  CommercialProposal,
  DEFAULT_CONDITIONS,
  renderCommercialMarkdown,
} from './commercial-proposal';
import { DocxExportService } from './docx-export.service';
import { GenerateCommercialDto } from './dto/deliverable.dto';
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

  /**
   * Génère la proposition commerciale (spec 7.3) : assemblage déterministe
   * à partir du bordereau importé — aucun LLM sur les prix.
   */
  async generateCommercial(
    userId: string,
    tenderId: string,
    dto: GenerateCommercialDto,
  ) {
    const tender = await this.assertOwnedTender(userId, tenderId);

    const schedule = await this.prisma.priceSchedule.findFirst({
      where: { tenderId, isCurrent: true },
    });
    if (!schedule) {
      throw new BadRequestException(
        "Importez d'abord le bordereau de prix (GET .../price-schedule/template puis POST .../price-schedule)",
      );
    }

    const doc = buildCommercialProposal({
      companyName: tender.profile.legalName,
      tenderTitle: tender.title ?? "Appel d'offres",
      currency: schedule.currency,
      items: schedule.items as unknown as CommercialItem[],
      totalExclTax: Number(schedule.totalExclTax),
      taxRate: Number(schedule.taxRate),
      taxAmount: Number(schedule.taxAmount),
      totalInclTax: Number(schedule.totalInclTax),
      conditions: {
        offerValidityDays:
          dto.offerValidityDays ?? DEFAULT_CONDITIONS.offerValidityDays,
        paymentTerms: dto.paymentTerms ?? DEFAULT_CONDITIONS.paymentTerms,
        warrantyTerms: dto.warrantyTerms ?? DEFAULT_CONDITIONS.warrantyTerms,
        executionDelay:
          dto.executionDelay ?? DEFAULT_CONDITIONS.executionDelay,
      },
    });

    return this.prisma.deliverable.create({
      data: {
        tenderId,
        type: DeliverableType.COMMERCIAL_PROPOSAL,
        priceScheduleId: schedule.id,
        createdById: userId,
        model: 'deterministic', // pas d'IA : montants issus du bordereau
        content: doc as unknown as Prisma.InputJsonValue,
        markdown: renderCommercialMarkdown(doc),
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
    const markdown = this.renderMarkdown(deliverable.type, content);

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

    let buffer: Buffer;
    let slug: string;
    switch (deliverable.type) {
      case DeliverableType.ANALYSIS:
        buffer = await this.docxExport.renderAnalysis(
          deliverable.content as unknown as AnalysisDocument,
          tender.profile.legalName,
        );
        slug = 'analyse';
        break;
      case DeliverableType.TECHNICAL_PROPOSAL:
        buffer = await this.docxExport.renderTechnical(
          deliverable.content as unknown as TechnicalProposal,
          tender.profile.legalName,
        );
        slug = 'proposition-technique';
        break;
      case DeliverableType.COMMERCIAL_PROPOSAL:
        buffer = await this.docxExport.renderCommercial(
          deliverable.content as unknown as CommercialProposal,
        );
        slug = 'proposition-commerciale';
        break;
    }
    return {
      filename: `${slug}-${deliverableId.slice(0, 8)}.docx`,
      buffer,
      reviewed: !!deliverable.reviewedAt,
    };
  }

  private renderMarkdown(
    type: DeliverableType,
    content: Record<string, unknown>,
  ): string {
    switch (type) {
      case DeliverableType.ANALYSIS:
        return renderAnalysisMarkdown(content as unknown as AnalysisDocument);
      case DeliverableType.TECHNICAL_PROPOSAL:
        return renderTechnicalMarkdown(
          content as unknown as TechnicalProposal,
        );
      case DeliverableType.COMMERCIAL_PROPOSAL:
        return renderCommercialMarkdown(
          content as unknown as CommercialProposal,
        );
    }
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
