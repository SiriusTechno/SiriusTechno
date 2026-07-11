import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * La création ET la mise à jour passent par le même DTO : une "mise à jour"
 * d'un exercice existant crée une nouvelle version (historique versionné,
 * spec 4.1.B) — jamais d'écrasement.
 */
export class UpsertFinancialYearDto {
  @IsInt()
  @Min(1990)
  @Max(2100)
  @Type(() => Number)
  fiscalYear!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  revenue!: number; // chiffre d'affaires

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsUUID()
  balanceSheetFileId?: string;

  @IsOptional()
  @IsUUID()
  bankAttestationFileId?: string;

  @IsOptional()
  @IsUUID()
  taxClearanceFileId?: string;
}
