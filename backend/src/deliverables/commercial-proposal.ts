import { formatAmount, frenchNumberToWords } from './french-number-words';

export interface CommercialItem {
  number: number;
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CommercialConditions {
  offerValidityDays: number;
  paymentTerms: string;
  warrantyTerms: string;
  executionDelay: string;
}

export interface CommercialProposal {
  title: string;
  companyName: string;
  tenderTitle: string;
  currency: string;
  submissionText: string;
  items: CommercialItem[];
  totals: {
    totalExclTax: number;
    taxRate: number;
    taxAmount: number;
    totalInclTax: number;
    totalInclTaxInWords: string;
  };
  conditions: CommercialConditions;
}

export const DEFAULT_CONDITIONS: CommercialConditions = {
  offerValidityDays: 90,
  paymentTerms:
    'Paiement selon les modalités prévues au dossier d\'appel d\'offres, sur présentation de décomptes approuvés par le maître d\'ouvrage.',
  warrantyTerms:
    'Garantie de bonne exécution conformément aux dispositions du dossier d\'appel d\'offres.',
  executionDelay: 'Conformément au délai prévu au dossier d\'appel d\'offres.',
};

/**
 * Assemblage DÉTERMINISTE de la proposition commerciale (spec 7.3) : les
 * montants viennent exclusivement du bordereau importé — aucun LLM ici,
 * aucun risque d'halluciner un prix.
 */
export function buildCommercialProposal(input: {
  companyName: string;
  tenderTitle: string;
  currency: string;
  items: CommercialItem[];
  totalExclTax: number;
  taxRate: number;
  taxAmount: number;
  totalInclTax: number;
  conditions: CommercialConditions;
}): CommercialProposal {
  const totalWords = frenchNumberToWords(input.totalInclTax);
  return {
    title: `Proposition commerciale — ${input.tenderTitle}`,
    companyName: input.companyName,
    tenderTitle: input.tenderTitle,
    currency: input.currency,
    submissionText:
      `Nous soussignés, ${input.companyName}, après avoir pris connaissance de l'ensemble des pièces du dossier d'appel d'offres « ${input.tenderTitle} », ` +
      `nous engageons à exécuter les prestations conformément audit dossier, moyennant le montant total, toutes taxes comprises, ` +
      `de ${formatAmount(input.totalInclTax)} ${input.currency} (${totalWords} francs CFA).`,
    items: input.items,
    totals: {
      totalExclTax: input.totalExclTax,
      taxRate: input.taxRate,
      taxAmount: input.taxAmount,
      totalInclTax: input.totalInclTax,
      totalInclTaxInWords: totalWords,
    },
    conditions: input.conditions,
  };
}

/** Rendu Markdown déterministe de la proposition commerciale. */
export function renderCommercialMarkdown(doc: CommercialProposal): string {
  const lines: string[] = [];
  lines.push(`# ${doc.title}`, '');
  lines.push(doc.submissionText, '');

  lines.push('## Bordereau des prix', '');
  lines.push('| N° | Désignation | Unité | Quantité | Prix unitaire HT | Prix total HT |');
  lines.push('|---|---|---|---|---|---|');
  for (const item of doc.items) {
    lines.push(
      `| ${item.number} | ${item.designation} | ${item.unit || '—'} | ${formatAmount(item.quantity)} | ${formatAmount(item.unitPrice)} | ${formatAmount(item.totalPrice)} |`,
    );
  }
  lines.push('');

  lines.push('## Récapitulatif', '');
  lines.push(`| | Montant (${doc.currency}) |`);
  lines.push('|---|---|');
  lines.push(`| Total HT | ${formatAmount(doc.totals.totalExclTax)} |`);
  lines.push(
    `| TVA (${(doc.totals.taxRate * 100).toFixed(2).replace(/\.?0+$/, '')} %) | ${formatAmount(doc.totals.taxAmount)} |`,
  );
  lines.push(`| **Total TTC** | **${formatAmount(doc.totals.totalInclTax)}** |`);
  lines.push('');
  lines.push(
    `Arrêté le présent bordereau à la somme de **${doc.totals.totalInclTaxInWords} francs CFA** toutes taxes comprises.`,
    '',
  );

  lines.push('## Conditions commerciales', '');
  lines.push(`- **Validité de l'offre** : ${doc.conditions.offerValidityDays} jours à compter de la date de dépôt.`);
  lines.push(`- **Modalités de paiement** : ${doc.conditions.paymentTerms}`);
  lines.push(`- **Garanties** : ${doc.conditions.warrantyTerms}`);
  lines.push(`- **Délai d'exécution** : ${doc.conditions.executionDelay}`);
  lines.push('');

  return lines.join('\n');
}
