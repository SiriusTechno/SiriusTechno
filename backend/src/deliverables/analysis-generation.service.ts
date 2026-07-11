import Anthropic from '@anthropic-ai/sdk';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ANALYSIS_DOCUMENT_SCHEMA,
  AnalysisDocument,
} from './analysis-document.schema';

const SYSTEM_PROMPT = `Tu rédiges le document d'analyse interne d'une entreprise qui envisage de répondre à un appel d'offres.
On te fournit le rapport de matching : pour chaque exigence de l'AO, son statut (COVERED / PARTIAL / NOT_COVERED), les éléments du profil qui la couvrent, la justification et l'écart.

Ta tâche : produire l'analyse forces/faiblesses, les écarts, et une recommandation go/no-go argumentée (spec : aide à la décision interne, pas destinée au client).

Règles strictes :
- Fonde-toi UNIQUEMENT sur le rapport de matching fourni. N'invente aucune capacité, aucun projet, aucune personne.
- Dans "evidence", cite les éléments du profil par leur libellé tel qu'il apparaît dans le rapport.
- Ne masque jamais un écart : chaque exigence PARTIAL ou NOT_COVERED du rapport doit apparaître dans "gaps".
- Recommandation : GO si les exigences éliminatoires sont couvertes ; GO_WITH_RESERVATIONS si des écarts existent mais sont surmontables (précise comment) ; NO_GO si des exigences éliminatoires ne sont pas couvertes sans solution réaliste.
- Rédige en français professionnel, précis et direct.`;

/** Génération du document d'analyse (spec 7.1) à partir du matching. */
@Injectable()
export class AnalysisGenerationService {
  private readonly client: Anthropic | null;
  readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    this.model = config.get<string>('ANTHROPIC_MODEL') ?? 'claude-opus-4-8';
  }

  async generate(
    tenderTitle: string,
    companyName: string,
    matchingData: Record<string, unknown>,
  ): Promise<AnalysisDocument> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "La génération par IA n'est pas configurée : définissez ANTHROPIC_API_KEY dans l'environnement.",
      );
    }

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: 'json_schema',
          schema: ANALYSIS_DOCUMENT_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [
        {
          role: 'user',
          content: `Entreprise candidate : ${companyName}\nAppel d'offres : ${tenderTitle}\n\n<rapport_de_matching>\n${JSON.stringify(matchingData, null, 2)}\n</rapport_de_matching>\n\nRédige le document d'analyse du profil.`,
        },
      ],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      throw new ServiceUnavailableException(
        'La génération a été refusée par le modèle. Réessayez.',
      );
    }
    if (message.stop_reason === 'max_tokens') {
      throw new ServiceUnavailableException(
        'Rapport de matching trop volumineux pour une génération en un appel.',
      );
    }

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new ServiceUnavailableException(
        "La génération n'a produit aucun résultat exploitable.",
      );
    }
    return JSON.parse(textBlock.text) as AnalysisDocument;
  }
}
