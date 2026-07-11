import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePersonnelDto {
  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  position!: string; // fonction

  @IsOptional()
  @IsString()
  experienceSummary?: string;

  @IsOptional()
  @IsUUID()
  photoFileId?: string;

  @IsOptional()
  @IsUUID()
  cvFileId?: string;
}

export class UpdatePersonnelDto extends PartialType(CreatePersonnelDto) {}

export class CreateDiplomaDto {
  @IsString()
  @MinLength(1)
  title!: string; // intitulé

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsUUID()
  fileId?: string;
}

export class CreatePersonnelCertificationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  issuingBody?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  obtainedAt?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @IsOptional()
  @IsUUID()
  fileId?: string;
}
