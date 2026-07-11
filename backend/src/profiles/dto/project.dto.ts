import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  contractingAuthority?: string; // maître d'ouvrage

  @IsOptional()
  @IsString()
  workType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  finalAcceptanceFileId?: string; // PV de réception définitive

  @IsOptional()
  @IsUUID()
  goodExecutionFileId?: string; // attestation de bonne exécution
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class AddProjectPhotoDto {
  @IsUUID()
  fileId!: string;

  @IsOptional()
  @IsString()
  caption?: string;
}
