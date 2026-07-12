import { DeliverablesService } from './deliverables.service';

describe('DeliverablesService.extractGaps — signalement avant génération (spec 7.2)', () => {
  const service = new DeliverablesService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { get: () => undefined } as never,
  );

  it('remonte les exigences PARTIAL et NOT_COVERED', () => {
    const gaps = service.extractGaps({
      requirements: [
        { requirement: 'RC', status: 'COVERED' },
        { requirement: '2 projets similaires', status: 'PARTIAL' },
        { requirement: '1 compacteur', status: 'NOT_COVERED' },
      ],
    });
    expect(gaps.map((g) => g.requirement)).toEqual([
      '2 projets similaires',
      '1 compacteur',
    ]);
  });

  it('retourne vide quand tout est couvert ou sans exigences', () => {
    expect(
      service.extractGaps({
        requirements: [{ requirement: 'RC', status: 'COVERED' }],
      }),
    ).toHaveLength(0);
    expect(service.extractGaps({})).toHaveLength(0);
  });
});
