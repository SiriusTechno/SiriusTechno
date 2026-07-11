import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileCategory, Prisma } from '@prisma/client';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { PriceScheduleParserService } from './price-schedule-parser.service';
import { PriceScheduleTemplateService } from './price-schedule-template.service';

const DEFAULT_TAX_RATE = 0.18; // TVA Côte d'Ivoire

@Injectable()
export class PriceScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly template: PriceScheduleTemplateService,
    private readonly parser: PriceScheduleParserService,
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

  /** Template Excel à remplir (spec 7.3 — import assisté). */
  async buildTemplate(userId: string, tenderId: string) {
    const tender = await this.assertOwnedTender(userId, tenderId);
    const buffer = await this.template.build(
      tender.title ?? "Appel d'offres",
    );
    return {
      buffer,
      filename: `bordereau-prix-${tenderId.slice(0, 8)}.xlsx`,
    };
  }

  /**
   * Import du bordereau rempli. Versionné comme les finances (spec 4.1.B) :
   * chaque ré-import crée une nouvelle version, sans écraser la précédente.
   */
  async import(
    userId: string,
    tenderId: string,
    file: Express.Multer.File,
    taxRate?: number,
  ) {
    const tender = await this.assertOwnedTender(userId, tenderId);
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    const rate = taxRate ?? DEFAULT_TAX_RATE;
    if (rate < 0 || rate > 1) {
      throw new BadRequestException(
        'Taux de TVA invalide : valeur entre 0 et 1 attendue (ex : 0.18)',
      );
    }

    const parsed = await this.parser.parse(file.buffer);
    // Le contenu vient d'être validé comme un vrai .xlsx : on normalise le
    // type MIME (certains clients envoient application/octet-stream).
    file.mimetype =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const taxAmount = Math.round(parsed.totalExclTax * rate * 100) / 100;
    const totalInclTax =
      Math.round((parsed.totalExclTax + taxAmount) * 100) / 100;

    // Conservation du fichier source (traçabilité)
    const stored = await this.files.upload(userId, file, {
      profileId: tender.profileId,
      category: FileCategory.OTHER,
    });

    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.priceSchedule.findFirst({
        where: { tenderId },
        orderBy: { version: 'desc' },
      });
      if (latest) {
        await tx.priceSchedule.updateMany({
          where: { tenderId, isCurrent: true },
          data: { isCurrent: false },
        });
      }
      return tx.priceSchedule.create({
        data: {
          tenderId,
          items: parsed.items as unknown as Prisma.InputJsonValue,
          totalExclTax: parsed.totalExclTax,
          taxRate: rate,
          taxAmount,
          totalInclTax,
          sourceFileId: stored.id,
          version: (latest?.version ?? 0) + 1,
          isCurrent: true,
          createdById: userId,
        },
      });
    });
  }

  /** Version courante du bordereau. */
  async current(userId: string, tenderId: string) {
    await this.assertOwnedTender(userId, tenderId);
    const schedule = await this.prisma.priceSchedule.findFirst({
      where: { tenderId, isCurrent: true },
      include: {
        sourceFile: true,
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!schedule) {
      throw new NotFoundException(
        "Aucun bordereau de prix importé pour cet appel d'offres — téléchargez le template via GET .../price-schedule/template",
      );
    }
    return schedule;
  }

  /** Historique des versions importées. */
  async history(userId: string, tenderId: string) {
    await this.assertOwnedTender(userId, tenderId);
    return this.prisma.priceSchedule.findMany({
      where: { tenderId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        isCurrent: true,
        totalExclTax: true,
        totalInclTax: true,
        createdAt: true,
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }
}
