import Anthropic from '@anthropic-ai/sdk';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MATCHING_SCHEMA, MatchingResult } from './matching.schema';
import { ProfileSnapshot } from './profile-snapshot.service';

const SYSTEM_PROMPT = `Tu es le moteur de matching d'une application de réponse aux appels d'offres.
On te fournit :
1. La grille de conformité d'un appel d'offres (les exigences extraites du document).
2. Le profil structuré de l'entreprise candidate : projets de référence, personnel, matériel, données financières, certifications — chaque élément porte un "id".

Ta tâche : pour CHAQUE exigence de la grille, déterminer si le profil la couvre.

Règles strictes :
- Tu ne peux t'appuyer QUE sur les éléments présents dans le profil fourni. N'invente jamais une expérience, une qualification, un matériel ou un document absent.
- Dans "matchedElements", le champ "id" doit être recopié EXACTEMENT depuis le profil. Ne fabrique jamais d'id.
- Statuts : COVERED (l'exigence est pleinement satisfaite par les éléments cités), PARTIAL (satisfaite en partie — explique l'écart dans "gap"), NOT_COVERED (aucun élément du profil ne la couvre — "matchedElements" vide, "gap" décrit le manque).
- Sois exigeant : un projet "similaire" doit l'être par la nature des travaux ET l'ordre de grandeur du montant ; un profil de personnel doit correspondre en qualification ET en expérience.
- Couvre TOUTES les exigences de la grille, y compris administratives et financières.
- Réponds en français dans "justification" et "gap".`;

/** Appel LLM du moteur de matching (spec 6). */
@Injectable()
export class MatchingAnalysisService {
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

  async match(
    grid: Record<string, unknown>,
    profile: ProfileSnapshot,
  ): Promise<MatchingResult> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "Le matching par IA n'est pas configuré : définissez ANTHROPIC_API_KEY dans l'environnement.",
      );
    }

    const { validElementIds: _ids, ...profileForLlm } = profile;

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: 'json_schema',
          schema: MATCHING_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [
        {
          role: 'user',
          content: `<grille_de_conformite>\n${JSON.stringify(grid, null, 2)}\n</grille_de_conformite>\n\n<profil_entreprise>\n${JSON.stringify(profileForLlm, null, 2)}\n</profil_entreprise>\n\nProduis le matching complet exigence par exigence.`,
        },
      ],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      throw new ServiceUnavailableException(
        'Le matching a été refusé par le modèle. Réessayez.',
      );
    }
    if (message.stop_reason === 'max_tokens') {
      throw new ServiceUnavailableException(
        'Profil ou grille trop volumineux pour un matching en un appel.',
      );
    }

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new ServiceUnavailableException(
        "Le matching n'a produit aucun résultat exploitable.",
      );
    }
    return JSON.parse(textBlock.text) as MatchingResult;
  }
}
