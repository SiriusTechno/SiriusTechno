import { Injectable } from '@nestjs/common';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { AnalysisDocument } from './analysis-document.schema';
import { CommercialProposal } from './commercial-proposal';
import { formatAmount } from './french-number-words';
import { TechnicalProposal } from './technical-proposal.schema';

const RECOMMENDATION_LABELS: Record<string, string> = {
  GO: 'GO — soumissionner',
  GO_WITH_RESERVATIONS: 'GO sous réserves',
  NO_GO: 'NO-GO — ne pas soumissionner',
};

/** Export Word des livrables (spec 8) — génération docx sans template externe. */
@Injectable()
export class DocxExportService {
  async renderAnalysis(
    doc: AnalysisDocument,
    companyName: string,
  ): Promise<Buffer> {
    const children: (Paragraph | Table)[] = [
      this.title(doc.title),
      this.subtitle(
        `${companyName} — document interne d'aide à la décision, non destiné au client`,
      ),
      this.heading('Recommandation'),
      new Paragraph({
        children: [
          new TextRun({
            text: RECOMMENDATION_LABELS[doc.recommendation] ?? doc.recommendation,
            bold: true,
          }),
        ],
      }),
      ...this.paragraphs(doc.recommendationRationale),
      this.heading('Forces'),
    ];

    if (doc.strengths.length === 0) {
      children.push(this.italic('Aucune force notable identifiée face à cet AO.'));
    }
    for (const s of doc.strengths) {
      children.push(this.bullet(s.point, 0));
      children.push(this.bullet(`Source : ${s.evidence}`, 1));
    }

    children.push(this.heading('Faiblesses'));
    if (doc.weaknesses.length === 0) {
      children.push(this.italic('Aucune faiblesse notable identifiée.'));
    }
    for (const w of doc.weaknesses) {
      children.push(this.bullet(w.point, 0));
      children.push(this.bullet(`Impact : ${w.impact}`, 1));
    }

    children.push(this.heading('Écarts par rapport aux exigences'));
    if (doc.gaps.length === 0) {
      children.push(this.italic('Toutes les exigences identifiées sont couvertes.'));
    } else {
      children.push(
        this.table(
          ['Exigence', 'Statut', 'Piste de mitigation'],
          doc.gaps.map((g) => [
            g.requirement,
            g.status === 'NOT_COVERED' ? 'Non couvert' : 'Partiellement couvert',
            g.mitigation || '—',
          ]),
        ),
      );
    }

    children.push(this.heading('Conclusion'));
    children.push(...this.paragraphs(doc.conclusion));

    return Packer.toBuffer(new Document({ sections: [{ children }] }));
  }

  async renderTechnical(
    doc: TechnicalProposal,
    companyName: string,
  ): Promise<Buffer> {
    const children: (Paragraph | Table)[] = [
      this.title(doc.title),
      this.subtitle(companyName),
    ];

    for (const section of doc.sections) {
      children.push(this.heading(section.heading));
      children.push(...this.paragraphs(section.content));
      if (section.sources.length > 0) {
        children.push(
          this.italic(`Sources profil : ${section.sources.join(' ; ')}`),
        );
      }
    }

    if (doc.unresolvedGaps.length > 0) {
      children.push(
        this.heading(
          'Écarts non couverts (usage interne — à retirer avant envoi)',
        ),
      );
      for (const gap of doc.unresolvedGaps) {
        children.push(this.bullet(gap, 0));
      }
    }

    return Packer.toBuffer(new Document({ sections: [{ children }] }));
  }

  async renderCommercial(doc: CommercialProposal): Promise<Buffer> {
    const children: (Paragraph | Table)[] = [
      this.title(doc.title),
      this.subtitle(doc.companyName),
      ...this.paragraphs(doc.submissionText),
      this.heading('Bordereau des prix'),
      this.table(
        ['N°', 'Désignation', 'Unité', 'Quantité', 'Prix unitaire HT', 'Prix total HT'],
        doc.items.map((i) => [
          String(i.number),
          i.designation,
          i.unit || '—',
          formatAmount(i.quantity),
          formatAmount(i.unitPrice),
          formatAmount(i.totalPrice),
        ]),
      ),
      this.heading('Récapitulatif'),
      this.table(
        ['', `Montant (${doc.currency})`],
        [
          ['Total HT', formatAmount(doc.totals.totalExclTax)],
          [
            `TVA (${(doc.totals.taxRate * 100).toFixed(2).replace(/\.?0+$/, '')} %)`,
            formatAmount(doc.totals.taxAmount),
          ],
          ['Total TTC', formatAmount(doc.totals.totalInclTax)],
        ],
      ),
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: `Arrêté le présent bordereau à la somme de ${doc.totals.totalInclTaxInWords} francs CFA toutes taxes comprises.`,
            bold: true,
          }),
        ],
      }),
      this.heading('Conditions commerciales'),
      this.bullet(
        `Validité de l'offre : ${doc.conditions.offerValidityDays} jours à compter de la date de dépôt.`,
        0,
      ),
      this.bullet(`Modalités de paiement : ${doc.conditions.paymentTerms}`, 0),
      this.bullet(`Garanties : ${doc.conditions.warrantyTerms}`, 0),
      this.bullet(`Délai d'exécution : ${doc.conditions.executionDelay}`, 0),
    ];

    return Packer.toBuffer(new Document({ sections: [{ children }] }));
  }

  // --- helpers -------------------------------------------------------------

  private title(text: string): Paragraph {
    return new Paragraph({
      text,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    });
  }

  private subtitle(text: string): Paragraph {
    return new Paragraph({
      children: [new TextRun({ text, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    });
  }

  private heading(text: string): Paragraph {
    return new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 120 },
    });
  }

  private italic(text: string): Paragraph {
    return new Paragraph({
      children: [new TextRun({ text, italics: true })],
    });
  }

  private bullet(text: string, level: number): Paragraph {
    return new Paragraph({ text, bullet: { level } });
  }

  /** Découpe un contenu texte en paragraphes et puces ("- "). */
  private paragraphs(content: string): Paragraph[] {
    return content
      .split(/\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0)
      .map((line) =>
        line.startsWith('- ')
          ? this.bullet(line.slice(2), 0)
          : new Paragraph({ text: line, spacing: { after: 120 } }),
      );
  }

  private table(header: string[], rows: string[][]): Table {
    const cell = (text: string, bold = false) =>
      new TableCell({
        children: [
          new Paragraph({ children: [new TextRun({ text, bold })] }),
        ],
      });
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: header.map((h) => cell(h, true)) }),
        ...rows.map(
          (r) => new TableRow({ children: r.map((c) => cell(c)) }),
        ),
      ],
    });
  }
}
