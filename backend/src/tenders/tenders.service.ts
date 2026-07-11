import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenderStatus } from '@prisma/client';
import { FilesService } from '../files/files.service';
import { StorageService } from '../files/storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateTenderDto } from './dto/create-tender.dto';
import { UpdateGridDto } from './dto/update-grid.dto';
import { GridAnalysisService } from './grid-analysis.service';
import { TextExtractionService } from './text-extraction.service';

@Injectable()
export class TendersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly files: FilesService,
    private readonly storage: StorageService,
    private readonly extraction: TextExtractionService,
    private readonly analysis: GridAnalysisService,
  ) {}

  private async assertOwned(userId: string, tenderId: string) {
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

  /** Crée l'AO à partir d'un fichier déjà uploadé, puis extrait le texte. */
  async create(userId: string, dto: CreateTenderDto) {
    await this.profiles.assertOwnership(dto.profileId, userId);
    const file = await this.files.findOwned(userId, dto.fileId);

    const existing = await this.prisma.tender.findUnique({
      where: { sourceFileId: file.id },
    });
    if (existing) {
      throw new BadRequestException(
        'Un appel d\'offres existe déjà pour ce fichier',
      );
    }

    const tender = await this.prisma.tender.create({
      data: {
        profileId: dto.profileId,
        title: dto.title,
        sourceFileId: file.id,
      },
    });
    return this.extractText(userId, tender.id);
  }

  findAll(userId: string, profileId?: string) {
    return this.prisma.tender.findMany({
      where: { profile: { ownerId: userId }, profileId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        profileId: true,
        textCharCount: true,
        pageCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(userId: string, tenderId: string) {
    await this.assertOwned(userId, tenderId);
    return this.prisma.tender.findUnique({
      where: { id: tenderId },
      include: { sourceFile: true, grid: true },
    });
  }

  /** Extraction (ou ré-extraction) du texte du document (spec 5.1). */
  async extractText(userId: string, tenderId: string) {
    const tender = await this.assertOwned(userId, tenderId);
    const file = await this.files.findOwned(userId, tender.sourceFileId);

    try {
      const stream = await this.storage.getStream(file.storageKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const result = await this.extraction.extract(
        Buffer.concat(chunks),
        file.mimeType,
      );

      return await this.prisma.tender.update({
        where: { id: tenderId },
        data: {
          extractedText: result.text,
          textCharCount: result.charCount,
          pageCount: result.pageCount,
          extractionError: result.needsOcr
            ? 'Document scanné détecté : trop peu de texte natif. Une reconnaissance optique (OCR) est nécessaire — non encore disponible.'
            : null,
          status: result.needsOcr
            ? TenderStatus.NEEDS_OCR
            : TenderStatus.TEXT_EXTRACTED,
        },
        include: { grid: true },
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      return this.prisma.tender.update({
        where: { id: tenderId },
        data: {
          status: TenderStatus.FAILED,
          extractionError: `Échec de l'extraction : ${(error as Error).message}`,
        },
      });
    }
  }

  /** Analyse LLM → grille de conformité (spec 5.2). */
  async analyze(userId: string, tenderId: string) {
    const tender = await this.assertOwned(userId, tenderId);
    if (
      tender.status !== TenderStatus.TEXT_EXTRACTED &&
      tender.status !== TenderStatus.GRID_READY
    ) {
      throw new BadRequestException(
        `Le texte du document doit être extrait avant l'analyse (statut actuel : ${tender.status})`,
      );
    }
    if (!tender.extractedText) {
      throw new BadRequestException('Aucun texte extrait pour ce document');
    }

    const gridData = (await this.analysis.extractGrid(
      tender.extractedText,
    )) as Prisma.InputJsonValue;

    const [, updated] = await this.prisma.$transaction([
      this.prisma.complianceGrid.upsert({
        where: { tenderId },
        create: {
          tenderId,
          data: gridData,
          originalData: gridData,
          model: this.analysis.model,
        },
        update: {
          data: gridData,
          originalData: gridData,
          editedByUser: false,
          model: this.analysis.model,
        },
      }),
      this.prisma.tender.update({
        where: { id: tenderId },
        data: { status: TenderStatus.GRID_READY },
        include: { grid: true },
      }),
    ]);
    return updated;
  }

  /**
   * Correction manuelle de la grille (spec 5.2 : étape auditable — la sortie
   * brute du LLM reste dans originalData, seule `data` est modifiée).
   */
  async updateGrid(userId: string, tenderId: string, dto: UpdateGridDto) {
    await this.assertOwned(userId, tenderId);
    const grid = await this.prisma.complianceGrid.findUnique({
      where: { tenderId },
    });
    if (!grid) {
      throw new NotFoundException(
        "Aucune grille de conformité : lancez d'abord l'analyse",
      );
    }
    return this.prisma.complianceGrid.update({
      where: { tenderId },
      data: {
        data: dto.data as Prisma.InputJsonValue,
        editedByUser: true,
      },
    });
  }

  async remove(userId: string, tenderId: string) {
    await this.assertOwned(userId, tenderId);
    await this.prisma.tender.delete({ where: { id: tenderId } });
  }
}
