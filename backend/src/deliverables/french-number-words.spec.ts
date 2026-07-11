import { frenchNumberToWords } from './french-number-words';

describe('frenchNumberToWords (montant en lettres, spec 7.3)', () => {
  const cases: Array<[number, string]> = [
    [0, 'zéro'],
    [1, 'un'],
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [95, 'quatre-vingt-quinze'],
    [100, 'cent'],
    [200, 'deux cents'],
    [201, 'deux cent un'],
    [1000, 'mille'],
    [1100, 'mille cent'],
    [80000, 'quatre-vingt mille'],
    [1000000, 'un million'],
    [2500000, 'deux millions cinq cent mille'],
    [147500000, 'cent quarante-sept millions cinq cent mille'],
    [1000000000, 'un milliard'],
  ];

  it.each(cases)('%i → « %s »', (n, expected) => {
    expect(frenchNumberToWords(n)).toBe(expected);
  });
});
