import Anthropic from '@anthropic-ai/sdk';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TECHNICAL_PROPOSAL_SCHEMA,
  TechnicalProposal,
} from './technical-proposal.schema';

const SYSTEM_PROMPT = `Tu rédiges la proposition technique d'une entreprise qui répond à un appel d'offres.
On te fournit :
1. La grille de conformité de l'AO (exigences, méthodologie et livrables attendus, critères de notation).
2. L'instantané du profil de l'entreprise (projets de référence, personnel, matériel, certifications, finances).
3. Le rapport de matching : quels éléments du profil couvrent quelles exigences, et quels écarts subsistent.

Règles strictes (spec 7.2) :
- Le contenu s'appuie EXCLUSIVEMENT sur les éléments du profil sélectionnés par le matching. N'invente jamais un projet, une personne, un équipement, une certification ou un chiffre.
- Si la grille impose un plan ou une structure de mémoire technique, suis-le (planImposedByTender = IMPOSED). Sinon, utilise le plan standard : Présentation de l'entreprise ; Compréhension du besoin ; Méthodologie d'exécution ; Moyens humains ; Moyens matériels ; Références similaires ; Planning prévisionnel (planImposedByTender = STANDARD).
- Chaque section liste dans "sources" les libellés exacts des éléments du profil qu'elle mobilise.
- Les exigences PARTIAL ou NOT_COVERED du matching ne doivent JAMAIS être présentées comme couvertes : liste-les dans "unresolvedGaps" (transparence interne). Dans le corps du texte, reste factuel sans prétendre couvrir ce qui ne l'est pas.
- Rédige en français professionnel de réponse à appel d'offres : précis, structuré, orienté maître d'ouvrage.
- Le planning reste qualitatif (phases et jalons) sauf si des délais précis figurent dans la grille.`;

/** Génération de la proposition technique (spec 7.2). */
@Injectable()
export class TechnicalGenerationService {
  private readonly client: Anthropic | null;
  readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    this.model = config.get<string>('ANTHROPIC_MODEL') ?? 'claude-opus-4-8';
  }

  async generate(input: {
    tenderTitle: string;
    companyName: string;
    grid: Record<string, unknown>;
    profileSnapshot: Record<string, unknown>;
    matchingData: Record<string, unknown>;
  }): Promise<TechnicalProposal> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "La génération par IA n'est pas configurée : définissez ANTHROPIC_API_KEY dans l'environnement.",
      );
    }

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 64000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: 'json_schema',
          schema: TECHNICAL_PROPOSAL_SCHEMA as unknown as Record<
            string,
            unknown
          >,
        },
      },
      messages: [
        {
          role: 'user',
          content: `Entreprise : ${input.companyName}\nAppel d'offres : ${input.tenderTitle}\n\n<grille_de_conformite>\n${JSON.stringify(input.grid, null, 2)}\n</grille_de_conformite>\n\n<profil_entreprise>\n${JSON.stringify(input.profileSnapshot, null, 2)}\n</profil_entreprise>\n\n<rapport_de_matching>\n${JSON.stringify(input.matchingData, null, 2)}\n</rapport_de_matching>\n\nRédige la proposition technique complète.`,
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
        'Données trop volumineuses pour une génération en un appel.',
      );
    }

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new ServiceUnavailableException(
        "La génération n'a produit aucun résultat exploitable.",
      );
    }
    return JSON.parse(textBlock.text) as TechnicalProposal;
  }
}
