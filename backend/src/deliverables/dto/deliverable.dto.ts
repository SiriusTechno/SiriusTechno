import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GenerateTechnicalDto {
  /**
   * Les écarts non couverts par le matching sont signalés avant génération
   * (spec 7.2) : la génération est refusée tant qu'ils ne sont pas
   * explicitement pris en compte par l'utilisateur.
   */
  @IsOptional()
  @IsBoolean()
  acknowledgeGaps?: boolean;
}

export class GenerateCommercialDto {
  /** Conditions commerciales — valeurs par défaut raisonnables si omises. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  offerValidityDays?: number;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  warrantyTerms?: string;

  @IsOptional()
  @IsString()
  executionDelay?: string;
}

export class UpdateDeliverableDto {
  /** Contenu structuré corrigé lors de la relecture (spec 8). */
  @IsObject()
  content!: Record<string, unknown>;
}
