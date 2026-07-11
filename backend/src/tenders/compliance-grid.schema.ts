/**
 * Schéma JSON de la grille de conformité (spec 5.2), imposé au LLM via les
 * structured outputs de l'API Claude — garantit une sortie JSON valide.
 * Convention : les champs texte absents du document valent "" et les listes [].
 */
export const COMPLIANCE_GRID_SCHEMA = {
  type: 'object',
  properties: {
    subjectOfContract: {
      type: 'string',
      description: "Objet du marché / nature des travaux ou services",
    },
    administrativeEligibility: {
      type: 'array',
      description:
        'Critères d\'éligibilité administrative : documents exigés (RC, NCC, attestations...)',
      items: {
        type: 'object',
        properties: {
          document: { type: 'string', description: 'Document exigé' },
          details: {
            type: 'string',
            description: 'Précisions (validité, forme, autorité émettrice...)',
          },
        },
        required: ['document', 'details'],
        additionalProperties: false,
      },
    },
    requiredExperience: {
      type: 'object',
      description: 'Expérience similaire exigée',
      properties: {
        minProjects: {
          type: 'string',
          description: 'Nombre de projets similaires exigés ("" si non précisé)',
        },
        minAmount: {
          type: 'string',
          description: 'Montant minimum par projet ou cumulé, avec devise',
        },
        nature: {
          type: 'string',
          description: 'Nature des travaux/services de référence exigés',
        },
        details: { type: 'string' },
      },
      required: ['minProjects', 'minAmount', 'nature', 'details'],
      additionalProperties: false,
    },
    keyPersonnel: {
      type: 'array',
      description: 'Personnel clé exigé',
      items: {
        type: 'object',
        properties: {
          role: { type: 'string', description: 'Profil / fonction exigée' },
          qualifications: {
            type: 'string',
            description: 'Diplômes et qualifications exigés',
          },
          minExperience: {
            type: 'string',
            description: "Expérience minimale exigée (années, projets)",
          },
          count: { type: 'string', description: 'Nombre de personnes exigé' },
        },
        required: ['role', 'qualifications', 'minExperience', 'count'],
        additionalProperties: false,
      },
    },
    requiredEquipment: {
      type: 'array',
      description: 'Matériel exigé',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', description: "Type d'équipement" },
          capacity: { type: 'string', description: 'Capacité / caractéristiques' },
          quantity: { type: 'string', description: 'Quantité exigée' },
        },
        required: ['type', 'capacity', 'quantity'],
        additionalProperties: false,
      },
    },
    methodologyDeliverables: {
      type: 'array',
      description: 'Méthodologie et livrables attendus',
      items: { type: 'string' },
    },
    scoringCriteria: {
      type: 'array',
      description: 'Critères et grille de notation (si disponible)',
      items: {
        type: 'object',
        properties: {
          criterion: { type: 'string' },
          weight: { type: 'string', description: 'Points ou pondération' },
        },
        required: ['criterion', 'weight'],
        additionalProperties: false,
      },
    },
    deadlines: {
      type: 'object',
      properties: {
        submissionDeadline: {
          type: 'string',
          description: 'Date limite de dépôt des offres',
        },
        executionDelay: {
          type: 'string',
          description: "Délai d'exécution du marché",
        },
      },
      required: ['submissionDeadline', 'executionDelay'],
      additionalProperties: false,
    },
    budget: {
      type: 'string',
      description: "Montant de l'enveloppe si mentionné ('' sinon)",
    },
    documentsToProvide: {
      type: 'array',
      description: 'Documents administratifs à fournir dans l\'offre',
      items: { type: 'string' },
    },
  },
  required: [
    'subjectOfContract',
    'administrativeEligibility',
    'requiredExperience',
    'keyPersonnel',
    'requiredEquipment',
    'methodologyDeliverables',
    'scoringCriteria',
    'deadlines',
    'budget',
    'documentsToProvide',
  ],
  additionalProperties: false,
} as const;
