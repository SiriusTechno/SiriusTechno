import {
  buildCommercialProposal,
  DEFAULT_CONDITIONS,
  renderCommercialMarkdown,
} from './commercial-proposal';

describe('Proposition commerciale (spec 7.3) — assemblage déterministe', () => {
  const doc = buildCommercialProposal({
    companyName: 'SIRIUS TECHNOLOGIES',
    tenderTitle: 'AO AGEROUTE 2026-014',
    currency: 'XOF',
    items: [
      {
        number: 1,
        designation: 'Installation de chantier',
        unit: 'fft',
        quantity: 1,
        unitPrice: 5000000,
        totalPrice: 5000000,
      },
      {
        number: 2,
        designation: 'Terrassement',
        unit: 'm3',
        quantity: 1200,
        unitPrice: 3500,
        totalPrice: 4200000,
      },
    ],
    totalExclTax: 9200000,
    taxRate: 0.18,
    taxAmount: 1656000,
    totalInclTax: 10856000,
    conditions: DEFAULT_CONDITIONS,
  });

  it('reprend les montants du bordereau à l\'identique et les écrit en lettres', () => {
    expect(doc.totals.totalInclTax).toBe(10856000);
    expect(doc.totals.totalInclTaxInWords).toBe(
      'dix millions huit cent cinquante-six mille',
    );
    expect(doc.submissionText).toContain('10 856 000 XOF');
    expect(doc.submissionText).toContain('SIRIUS TECHNOLOGIES');
  });

  it('rend le bordereau, le récapitulatif TVA et les conditions en Markdown', () => {
    const md = renderCommercialMarkdown(doc);
    expect(md).toContain('| 2 | Terrassement | m3 | 1 200 | 3 500 | 4 200 000 |');
    expect(md).toContain('| Total HT | 9 200 000 |');
    expect(md).toContain('| TVA (18 %) | 1 656 000 |');
    expect(md).toContain('| **Total TTC** | **10 856 000** |');
    expect(md).toContain('dix millions huit cent cinquante-six mille francs CFA');
    expect(md).toContain('Validité de l\'offre** : 90 jours');
  });
});
