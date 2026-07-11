const UNITS = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];
const TENS = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante',
  'soixante', 'quatre-vingt', 'quatre-vingt',
];

function below100(n: number): string {
  if (n < 20) return UNITS[n];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  // 70-79 et 90-99 : soixante-dix..., quatre-vingt-dix...
  if (ten === 7 || ten === 9) {
    const base = TENS[ten];
    const rest = UNITS[10 + unit];
    return unit === 1 && ten === 7 ? `${base} et onze` : `${base}-${rest}`;
  }
  if (unit === 0) {
    return ten === 8 ? 'quatre-vingts' : TENS[ten];
  }
  if (unit === 1 && ten !== 8) return `${TENS[ten]} et un`;
  return `${TENS[ten]}-${UNITS[unit]}`;
}

function below1000(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let out = '';
  if (hundreds === 1) out = 'cent';
  else if (hundreds > 1) out = `${UNITS[hundreds]} cent${rest === 0 ? 's' : ''}`;
  if (rest > 0) out += (out ? ' ' : '') + below100(rest);
  return out;
}

const SCALES: Array<[number, string, string]> = [
  [1_000_000_000_000, 'billion', 'billions'],
  [1_000_000_000, 'milliard', 'milliards'],
  [1_000_000, 'million', 'millions'],
  [1_000, 'mille', 'mille'],
];

/**
 * Montant entier en toutes lettres (français) — usage : « arrêté le présent
 * bordereau à la somme de … francs CFA ».
 */
export function frenchNumberToWords(value: number): string {
  const n = Math.round(Math.abs(value));
  if (n === 0) return 'zéro';

  let remainder = n;
  const parts: string[] = [];
  for (const [scale, singular, plural] of SCALES) {
    const count = Math.floor(remainder / scale);
    if (count === 0) continue;
    remainder %= scale;
    if (scale === 1000) {
      // « vingt » et « cent » perdent leur s devant « mille » (adjectif numéral)
      const words = below1000(count).replace(/(vingt|cent)s$/, '$1');
      parts.push(count === 1 ? 'mille' : `${words} mille`);
    } else {
      parts.push(`${below1000(count)} ${count > 1 ? plural : singular}`);
    }
  }
  if (remainder > 0) parts.push(below1000(remainder));
  return parts.join(' ');
}

/** Formate un montant : « 12 345 678 » (espaces insécables classiques). */
export function formatAmount(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(Math.round(value))
    .replace(/ | /g, ' ');
}
