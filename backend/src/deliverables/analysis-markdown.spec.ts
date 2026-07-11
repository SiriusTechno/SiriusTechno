import { AnalysisDocument } from './analysis-document.schema';
import { renderAnalysisMarkdown } from './analysis-markdown';

describe('renderAnalysisMarkdown (spec 7.1)', () => {
  const doc: AnalysisDocument = {
    title: 'Analyse — AO AGEROUTE 2026-014',
    recommendation: 'GO_WITH_RESERVATIONS',
    recommendationRationale: 'Expérience couverte mais matériel incomplet.',
    strengths: [
      {
        point: 'Deux projets routiers similaires',
        evidence: 'Réhabilitation route Abidjan-Bassam (85 MFCFA)',
      },
    ],
    weaknesses: [
      { point: 'Pas de compacteur en propriété', impact: 'Location à prévoir' },
    ],
    gaps: [
      {
        requirement: '1 compacteur',
        status: 'NOT_COVERED',
        mitigation: 'Location courte durée',
      },
    ],
    conclusion: 'Soumissionner après sécurisation de la location.',
  };

  it('rend toutes les sections avec la recommandation lisible', () => {
    const md = renderAnalysisMarkdown(doc);

    expect(md).toContain('# Analyse — AO AGEROUTE 2026-014');
    expect(md).toContain('GO sous réserves');
    expect(md).toContain('Deux projets routiers similaires');
    expect(md).toContain('Source : Réhabilitation route Abidjan-Bassam');
    expect(md).toContain('| 1 compacteur | Non couvert | Location courte durée |');
    expect(md).toContain('## Conclusion');
    expect(md).toContain('Document interne');
  });

  it('ne masque pas les écarts : la section existe même vide', () => {
    const md = renderAnalysisMarkdown({ ...doc, gaps: [] });
    expect(md).toContain('## Écarts par rapport aux exigences');
    expect(md).toContain('Toutes les exigences identifiées sont couvertes');
  });
});
