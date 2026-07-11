/**
 * Schéma JSON de la proposition technique (spec 7.2), imposé au LLM.
 * Plan imposé par l'AO si identifiable dans la grille, sinon plan standard :
 * présentation entreprise, compréhension du besoin, méthodologie, moyens
 * humains, moyens matériels, références similaires, planning.
 */
export const TECHNICAL_PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    planImposedByTender: {
      type: 'string',
      enum: ['IMPOSED', 'STANDARD'],
      description:
        "IMPOSED si le plan suit une structure exigée par l'AO, STANDARD sinon",
    },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string', description: 'Titre de la section' },
          content: {
            type: 'string',
            description:
              'Contenu rédigé de la section (paragraphes séparés par des lignes vides ; listes possibles avec "- ")',
          },
          sources: {
            type: 'array',
            description:
              'Éléments du profil utilisés dans cette section, cités par leur libellé (traçabilité spec 10)',
            items: { type: 'string' },
          },
        },
        required: ['heading', 'content', 'sources'],
        additionalProperties: false,
      },
    },
    unresolvedGaps: {
      type: 'array',
      description:
        "Écarts du matching que la proposition ne peut pas masquer — repris pour transparence interne ('' interdit : liste vide si aucun)",
      items: { type: 'string' },
    },
  },
  required: ['title', 'planImposedByTender', 'sections', 'unresolvedGaps'],
  additionalProperties: false,
} as const;

export interface TechnicalProposal {
  title: string;
  planImposedByTender: 'IMPOSED' | 'STANDARD';
  sections: Array<{ heading: string; content: string; sources: string[] }>;
  unresolvedGaps: string[];
}
