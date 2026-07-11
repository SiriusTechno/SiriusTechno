import { AnalysisDocument } from './analysis-document.schema';

const RECOMMENDATION_LABELS: Record<AnalysisDocument['recommendation'], string> =
  {
    GO: '✅ GO — soumissionner',
    GO_WITH_RESERVATIONS: '⚠️ GO sous réserves',
    NO_GO: '❌ NO-GO — ne pas soumissionner',
  };

const STATUS_LABELS: Record<string, string> = {
  PARTIAL: 'Partiellement couvert',
  NOT_COVERED: 'Non couvert',
};

/** Rendu Markdown déterministe du document d'analyse (spec 7.1). */
export function renderAnalysisMarkdown(doc: AnalysisDocument): string {
  const lines: string[] = [];
  lines.push(`# ${doc.title}`, '');
  lines.push('> Document interne d\'aide à la décision — non destiné au client.', '');

  lines.push('## Recommandation', '');
  lines.push(`**${RECOMMENDATION_LABELS[doc.recommendation]}**`, '');
  lines.push(doc.recommendationRationale, '');

  lines.push('## Forces', '');
  if (doc.strengths.length === 0) {
    lines.push('_Aucune force notable identifiée face à cet AO._', '');
  }
  for (const s of doc.strengths) {
    lines.push(`- **${s.point}**`);
    lines.push(`  - Source : ${s.evidence}`);
  }
  if (doc.strengths.length > 0) lines.push('');

  lines.push('## Faiblesses', '');
  if (doc.weaknesses.length === 0) {
    lines.push('_Aucune faiblesse notable identifiée._', '');
  }
  for (const w of doc.weaknesses) {
    lines.push(`- **${w.point}**`);
    lines.push(`  - Impact : ${w.impact}`);
  }
  if (doc.weaknesses.length > 0) lines.push('');

  lines.push('## Écarts par rapport aux exigences', '');
  if (doc.gaps.length === 0) {
    lines.push('_Toutes les exigences identifiées sont couvertes._', '');
  } else {
    lines.push('| Exigence | Statut | Piste de mitigation |');
    lines.push('|---|---|---|');
    for (const g of doc.gaps) {
      lines.push(
        `| ${g.requirement} | ${STATUS_LABELS[g.status] ?? g.status} | ${g.mitigation || '—'} |`,
      );
    }
    lines.push('');
  }

  lines.push('## Conclusion', '');
  lines.push(doc.conclusion, '');

  return lines.join('\n');
}
