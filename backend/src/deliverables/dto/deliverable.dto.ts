import { IsBoolean, IsObject, IsOptional } from 'class-validator';

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

export class UpdateDeliverableDto {
  /** Contenu structuré corrigé lors de la relecture (spec 8). */
  @IsObject()
  content!: Record<string, unknown>;
}
