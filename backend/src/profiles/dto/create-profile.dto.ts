import { PartialType } from '@nestjs/mapped-types';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateProfileDto {
  @IsString()
  @MinLength(2)
  legalName!: string; // raison sociale

  @IsOptional()
  @IsString()
  tradeName?: string; // nom commercial

  @IsOptional()
  @IsString()
  tradeRegisterNumber?: string; // registre de commerce

  @IsOptional()
  @IsString()
  nccNumber?: string;

  @IsOptional()
  @IsString()
  headOfficeAddress?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  logoFileId?: string;
}

export class UpdateProfileDto extends PartialType(CreateProfileDto) {}
