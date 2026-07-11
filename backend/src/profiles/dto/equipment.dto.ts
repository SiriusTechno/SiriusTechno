import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { OwnershipStatus } from '@prisma/client';

export class CreateEquipmentDto {
  @IsString()
  @MinLength(1)
  type!: string;

  @IsOptional()
  @IsEnum(OwnershipStatus)
  ownershipStatus?: OwnershipStatus; // propriété / location

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  capacity?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  @Type(() => Number)
  acquisitionYear?: number;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string; // immatriculation

  @IsOptional()
  @IsUUID()
  photoFileId?: string;

  @IsOptional()
  @IsUUID()
  ownershipProofFileId?: string; // attestation de propriété
}

export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {}
