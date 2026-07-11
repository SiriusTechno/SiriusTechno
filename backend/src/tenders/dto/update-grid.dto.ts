import { IsObject } from 'class-validator';

export class UpdateGridDto {
  /** Grille de conformité corrigée par l'utilisateur (structure spec 5.2). */
  @IsObject()
  data!: Record<string, unknown>;
}
