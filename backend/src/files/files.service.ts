import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileCategory, StoredFile } from '@prisma/client';
import { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage/storage.service';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 Mo

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    userId: string,
    file: Express.Multer.File,
    options: { profileId?: string; category?: FileCategory },
  ): Promise<StoredFile> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Fichier trop volumineux (max 25 Mo)');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé : ${file.mimetype}`,
      );
    }
    if (options.profileId) {
      const profile = await this.prisma.companyProfile.findUnique({
        where: { id: options.profileId },
      });
      if (!profile || profile.ownerId !== userId) {
        throw new ForbiddenException('Profil introuvable ou accès refusé');
      }
    }

    const key = this.storage.buildKey(
      options.profileId ?? null,
      file.originalname,
    );
    await this.storage.put(key, file.buffer, file.mimetype);

    return this.prisma.storedFile.create({
      data: {
        ownerId: userId,
        profileId: options.profileId,
        category: options.category ?? FileCategory.OTHER,
        storageKey: key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  }

  /** Contrôle d'accès : seul le propriétaire du fichier peut y accéder. */
  async findOwned(userId: string, fileId: string): Promise<StoredFile> {
    const file = await this.prisma.storedFile.findUnique({
      where: { id: fileId },
    });
    if (!file) {
      throw new NotFoundException('Fichier introuvable');
    }
    if (file.ownerId !== userId) {
      throw new ForbiddenException('Accès refusé');
    }
    return file;
  }

  async download(
    userId: string,
    fileId: string,
  ): Promise<{ file: StoredFile; stream: Readable }> {
    const file = await this.findOwned(userId, fileId);
    return { file, stream: await this.storage.getStream(file.storageKey) };
  }

  async remove(userId: string, fileId: string): Promise<void> {
    const file = await this.findOwned(userId, fileId);
    await this.prisma.storedFile.delete({ where: { id: file.id } });
    await this.storage.delete(file.storageKey);
  }
}
