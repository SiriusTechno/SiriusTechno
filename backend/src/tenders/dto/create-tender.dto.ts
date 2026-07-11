import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTenderDto {
  @IsUUID()
  profileId!: string;

  /** Fichier .pdf ou .docx déjà uploadé via POST /api/files. */
  @IsUUID()
  fileId!: string;

  @IsOptional()
  @IsString()
  title?: string;
}
