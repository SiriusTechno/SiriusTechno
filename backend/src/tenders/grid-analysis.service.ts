import Anthropic from '@anthropic-ai/sdk';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { COMPLIANCE_GRID_SCHEMA } from './compliance-grid.schema';

const SYSTEM_PROMPT = `Tu es un analyste d'appels d'offres pour des marchés publics et privés en Afrique de l'Ouest (Côte d'Ivoire, CEDEAO).
On te fournit le texte brut extrait d'un document d'appel d'offres (cahier des charges, dossier d'appel d'offres, termes de référence).
Ta tâche : extraire la grille de conformité — la liste précise et exhaustive des exigences du document.

Règles strictes :
- N'extrais QUE ce qui figure dans le document. N'invente jamais une exigence.
- Recopie les exigences chiffrées exactement (montants, années d'expérience, nombre de projets, délais), avec leur devise ou unité.
- Si une information est absente du document, mets une chaîne vide "" (ou une liste vide).
- Cette grille sera vérifiée et corrigée par un humain : privilégie l'exhaustivité et la fidélité au texte plutôt que la reformulation.`;

/**
 * Extraction structurée de la grille de conformité via l'API Claude (spec 5.2).
 * Appel distinct de la génération de contenu (spec 9) pour limiter les
 * hallucinations : ici on ne fait qu'extraire, jamais rédiger.
 */
@Injectable()
export class GridAnalysisService {
  private readonly client: Anthropic | null;
  readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    this.model = config.get<string>('ANTHROPIC_MODEL') ?? 'claude-opus-4-8';
  }

  get available(): boolean {
    return this.client !== null;
  }

  async extractGrid(tenderText: string): Promise<Record<string, unknown>> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "L'analyse par IA n'est pas configurée : définissez ANTHROPIC_API_KEY dans l'environnement.",
      );
    }

    // Streaming : le texte d'un AO peut être long, on évite les timeouts HTTP.
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: 'json_schema',
          schema: COMPLIANCE_GRID_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [
        {
          role: 'user',
          content: `Voici le texte extrait du document d'appel d'offres :\n\n<document>\n${tenderText}\n</document>\n\nExtrais la grille de conformité complète.`,
        },
      ],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      throw new ServiceUnavailableException(
        "L'analyse a été refusée par le modèle. Réessayez ou vérifiez le document.",
      );
    }
    if (message.stop_reason === 'max_tokens') {
      throw new ServiceUnavailableException(
        'Document trop volumineux pour une analyse en un appel. Contactez le support.',
      );
    }

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new ServiceUnavailableException(
        "L'analyse n'a produit aucun résultat exploitable.",
      );
    }
    return JSON.parse(textBlock.text) as Record<string, unknown>;
  }
}
