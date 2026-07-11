/**
 * Schéma JSON du document d'analyse du profil (spec 7.1), imposé au LLM.
 * Document à usage interne : forces/faiblesses, écarts, recommandation
 * go/no-go argumentée. Chaque affirmation cite sa source (spec 10).
 */
export const ANALYSIS_DOCUMENT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    recommendation: {
      type: 'string',
      enum: ['GO', 'GO_WITH_RESERVATIONS', 'NO_GO'],
    },
    recommendationRationale: {
      type: 'string',
      description: 'Argumentaire de la recommandation, fondé sur le matching',
    },
    strengths: {
      type: 'array',
      description: 'Forces du profil face aux exigences de cet AO',
      items: {
        type: 'object',
        properties: {
          point: { type: 'string' },
          evidence: {
            type: 'string',
            description:
              'Source dans le profil (projet, personne, matériel, exercice financier cités par leur libellé)',
          },
        },
        required: ['point', 'evidence'],
        additionalProperties: false,
      },
    },
    weaknesses: {
      type: 'array',
      description: 'Faiblesses par rapport aux exigences',
      items: {
        type: 'object',
        properties: {
          point: { type: 'string' },
          impact: {
            type: 'string',
            description: "Impact sur les chances de l'offre",
          },
        },
        required: ['point', 'impact'],
        additionalProperties: false,
      },
    },
    gaps: {
      type: 'array',
      description:
        'Écarts identifiés par le matching : exigences non couvertes ou partiellement couvertes',
      items: {
        type: 'object',
        properties: {
          requirement: { type: 'string' },
          status: { type: 'string', enum: ['PARTIAL', 'NOT_COVERED'] },
          mitigation: {
            type: 'string',
            description:
              'Piste pour combler l\'écart (sous-traitance, location, recrutement, groupement…) — "" si aucune',
          },
        },
        required: ['requirement', 'status', 'mitigation'],
        additionalProperties: false,
      },
    },
    conclusion: { type: 'string' },
  },
  required: [
    'title',
    'recommendation',
    'recommendationRationale',
    'strengths',
    'weaknesses',
    'gaps',
    'conclusion',
  ],
  additionalProperties: false,
} as const;

export interface AnalysisDocument {
  title: string;
  recommendation: 'GO' | 'GO_WITH_RESERVATIONS' | 'NO_GO';
  recommendationRationale: string;
  strengths: Array<{ point: string; evidence: string }>;
  weaknesses: Array<{ point: string; impact: string }>;
  gaps: Array<{ requirement: string; status: string; mitigation: string }>;
  conclusion: string;
}
