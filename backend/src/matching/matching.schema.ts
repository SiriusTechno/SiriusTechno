/**
 * Schéma JSON de la sortie du moteur de matching (spec 6), imposé au LLM.
 * Chaque exigence est classée COVERED / PARTIAL / NOT_COVERED et ne peut
 * référencer que des IDs d'éléments réels du profil (validés côté serveur).
 */
export const MATCHING_SCHEMA = {
  type: 'object',
  properties: {
    requirements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: [
              'ADMINISTRATIVE',
              'FINANCIAL',
              'EXPERIENCE',
              'PERSONNEL',
              'EQUIPMENT',
              'OTHER',
            ],
          },
          requirement: {
            type: 'string',
            description: "L'exigence, reprise de la grille de conformité",
          },
          status: {
            type: 'string',
            enum: ['COVERED', 'PARTIAL', 'NOT_COVERED'],
          },
          matchedElements: {
            type: 'array',
            description:
              'Éléments du profil qui couvrent (ou couvrent partiellement) cette exigence',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'PROJECT',
                    'PERSONNEL',
                    'EQUIPMENT',
                    'FINANCIAL_YEAR',
                    'ISO_CERTIFICATION',
                  ],
                },
                id: {
                  type: 'string',
                  description:
                    "ID exact de l'élément tel que fourni dans le profil — jamais inventé",
                },
                label: {
                  type: 'string',
                  description: "Libellé lisible de l'élément",
                },
              },
              required: ['type', 'id', 'label'],
              additionalProperties: false,
            },
          },
          justification: {
            type: 'string',
            description:
              'Pourquoi ces éléments couvrent (ou non) l\'exigence, en citant les données du profil',
          },
          gap: {
            type: 'string',
            description:
              "Ce qui manque pour couvrir totalement l'exigence ('' si couverte)",
          },
        },
        required: [
          'category',
          'requirement',
          'status',
          'matchedElements',
          'justification',
          'gap',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['requirements'],
  additionalProperties: false,
} as const;

export interface MatchedElement {
  type: string;
  id: string;
  label: string;
}

export interface RequirementMatch {
  category: string;
  requirement: string;
  status: 'COVERED' | 'PARTIAL' | 'NOT_COVERED';
  matchedElements: MatchedElement[];
  justification: string;
  gap: string;
}

export interface MatchingResult {
  requirements: RequirementMatch[];
}
