import { renderTechnicalMarkdown } from './technical-markdown';
import { TechnicalProposal } from './technical-proposal.schema';

describe('renderTechnicalMarkdown (spec 7.2)', () => {
  const doc: TechnicalProposal = {
    title: 'Proposition technique — AO AGEROUTE 2026-014',
    planImposedByTender: 'STANDARD',
    sections: [
      {
        heading: 'Références similaires',
        content:
          'Notre entreprise a réalisé :\n- Réhabilitation route Abidjan-Bassam (85 MFCFA)',
        sources: ['Réhabilitation route Abidjan-Bassam'],
      },
    ],
    unresolvedGaps: ['1 compacteur non disponible en propriété'],
  };

  it('rend les sections avec leurs sources', () => {
    const md = renderTechnicalMarkdown(doc);
    expect(md).toContain('# Proposition technique — AO AGEROUTE 2026-014');
    expect(md).toContain('## Références similaires');
    expect(md).toContain('_Sources profil : Réhabilitation route Abidjan-Bassam_');
  });

  it('ne masque jamais les écarts non couverts', () => {
    const md = renderTechnicalMarkdown(doc);
    expect(md).toContain('Écarts non couverts');
    expect(md).toContain('- 1 compacteur non disponible en propriété');
  });

  it('omet la section écarts quand tout est couvert', () => {
    const md = renderTechnicalMarkdown({ ...doc, unresolvedGaps: [] });
    expect(md).not.toContain('Écarts non couverts');
  });
});
