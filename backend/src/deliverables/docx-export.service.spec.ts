import { DocxExportService } from './docx-export.service';

describe('DocxExportService (spec 8)', () => {
  const service = new DocxExportService();

  it('produit un .docx valide (archive zip) pour le document d\'analyse', async () => {
    const buffer = await service.renderAnalysis(
      {
        title: 'Analyse — AO test',
        recommendation: 'GO',
        recommendationRationale: 'Toutes les exigences sont couvertes.',
        strengths: [{ point: 'Expérience', evidence: 'Projet X' }],
        weaknesses: [],
        gaps: [],
        conclusion: 'Soumissionner.',
      },
      'SIRIUS TECHNOLOGIES',
    );
    // signature ZIP "PK"
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('produit un .docx valide pour la proposition technique, avec tableau des écarts', async () => {
    const buffer = await service.renderTechnical(
      {
        title: 'Proposition technique — AO test',
        planImposedByTender: 'STANDARD',
        sections: [
          {
            heading: 'Moyens matériels',
            content: 'Liste :\n- Pelle hydraulique 20t',
            sources: ['Pelle hydraulique Caterpillar 320D'],
          },
        ],
        unresolvedGaps: ['Compacteur à louer'],
      },
      'SIRIUS TECHNOLOGIES',
    );
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
  });
});
