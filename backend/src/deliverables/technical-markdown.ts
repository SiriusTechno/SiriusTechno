import { TechnicalProposal } from './technical-proposal.schema';

/** Rendu Markdown déterministe de la proposition technique (spec 7.2). */
export function renderTechnicalMarkdown(doc: TechnicalProposal): string {
  const lines: string[] = [];
  lines.push(`# ${doc.title}`, '');

  for (const section of doc.sections) {
    lines.push(`## ${section.heading}`, '');
    lines.push(section.content, '');
    if (section.sources.length > 0) {
      lines.push(
        `_Sources profil : ${section.sources.join(' ; ')}_`,
        '',
      );
    }
  }

  if (doc.unresolvedGaps.length > 0) {
    lines.push('---', '');
    lines.push('## ⚠️ Écarts non couverts (usage interne — à retirer avant envoi)', '');
    for (const gap of doc.unresolvedGaps) {
      lines.push(`- ${gap}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
