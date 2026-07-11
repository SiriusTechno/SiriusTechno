import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateIsoCertificationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  standard!: string; // ex: ISO 9001

  @IsOptional()
  @IsString()
  certifyingBody?: string;

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
  certificateFileId?: string;
}

export class UpdateIsoCertificationDto extends PartialType(
  CreateIsoCertificationDto,
) {}
