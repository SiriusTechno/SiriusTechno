import { MatchingService } from './matching.service';
import { MatchingResult } from './matching.schema';

describe('MatchingService.sanitize — garde-fou anti-hallucination (spec 6)', () => {
  const service = new MatchingService(
    {} as never,
    {} as never,
    {} as never,
  );

  const validIds = new Set(['proj-1', 'pers-1']);

  it('conserve les éléments dont l\'ID existe dans le profil', () => {
    const result: MatchingResult = {
      requirements: [
        {
          category: 'EXPERIENCE',
          requirement: '2 projets similaires',
          status: 'COVERED',
          matchedElements: [
            { type: 'PROJECT', id: 'proj-1', label: 'Route Abidjan-Bassam' },
          ],
          justification: 'Projet routier de montant comparable',
          gap: '',
        },
      ],
    };

    const { requirements, removed } = service.sanitize(result, validIds);

    expect(removed).toBe(0);
    expect(requirements[0].matchedElements).toHaveLength(1);
    expect(requirements[0].status).toBe('COVERED');
  });

  it('retire les IDs inventés et requalifie COVERED → NOT_COVERED si plus rien ne couvre', () => {
    const result: MatchingResult = {
      requirements: [
        {
          category: 'PERSONNEL',
          requirement: 'Ingénieur hydraulicien',
          status: 'COVERED',
          matchedElements: [
            { type: 'PERSONNEL', id: 'halluciné-999', label: 'Expert inventé' },
          ],
          justification: '…',
          gap: '',
        },
      ],
    };

    const { requirements, removed } = service.sanitize(result, validIds);

    expect(removed).toBe(1);
    expect(requirements[0].matchedElements).toHaveLength(0);
    expect(requirements[0].status).toBe('NOT_COVERED');
  });

  it('retire un ID inventé mais garde le statut si un élément réel subsiste', () => {
    const result: MatchingResult = {
      requirements: [
        {
          category: 'EXPERIENCE',
          requirement: '2 projets similaires',
          status: 'PARTIAL',
          matchedElements: [
            { type: 'PROJECT', id: 'proj-1', label: 'Route Abidjan-Bassam' },
            { type: 'PROJECT', id: 'faux-2', label: 'Projet fantôme' },
          ],
          justification: '…',
          gap: 'Un seul projet réel',
        },
      ],
    };

    const { requirements, removed } = service.sanitize(result, validIds);

    expect(removed).toBe(1);
    expect(requirements[0].matchedElements.map((e) => e.id)).toEqual(['proj-1']);
    expect(requirements[0].status).toBe('PARTIAL');
  });
});
