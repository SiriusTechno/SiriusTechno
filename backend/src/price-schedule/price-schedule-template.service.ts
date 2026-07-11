import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

/** Colonnes attendues par l'import — l'ordre fait foi. */
export const TEMPLATE_COLUMNS = [
  'N°',
  'Désignation',
  'Unité',
  'Quantité',
  'Prix unitaire HT',
] as const;

export const TEMPLATE_SHEET_NAME = 'Bordereau';

/**
 * Génère le template Excel du bordereau de prix (spec 7.3 — import assisté).
 * Feuille 1 : bordereau à remplir (avec exemples), feuille 2 : instructions.
 */
@Injectable()
export class PriceScheduleTemplateService {
  async build(tenderTitle: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Application propositions AO';

    const sheet = workbook.addWorksheet(TEMPLATE_SHEET_NAME);

    // Titre
    sheet.mergeCells('A1:F1');
    const title = sheet.getCell('A1');
    title.value = `Bordereau des prix — ${tenderTitle}`;
    title.font = { bold: true, size: 14 };

    // En-têtes (ligne 3)
    const headerRow = sheet.getRow(3);
    TEMPLATE_COLUMNS.forEach((label, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = label;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      cell.border = { bottom: { style: 'thin' } };
    });
    headerRow.getCell(6).value = 'Prix total HT (calculé)';
    headerRow.getCell(6).font = { bold: true, italic: true };

    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 55;
    sheet.getColumn(3).width = 10;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 18;
    sheet.getColumn(6).width = 20;

    // Lignes d'exemple (à remplacer par l'utilisateur)
    const examples = [
      [1, 'EXEMPLE — Installation de chantier', 'fft', 1, 5000000],
      [2, 'EXEMPLE — Terrassement généraux', 'm3', 1200, 3500],
      [3, 'EXEMPLE — Fourniture et pose de béton dosé à 350 kg/m3', 'm3', 85, 95000],
    ];
    examples.forEach((row, i) => {
      const r = sheet.getRow(4 + i);
      row.forEach((v, j) => (r.getCell(j + 1).value = v));
      r.getCell(6).value = {
        formula: `D${4 + i}*E${4 + i}`,
      };
      r.font = { color: { argb: 'FF808080' }, italic: true };
    });

    // Lignes vides prêtes à remplir, avec formule de total
    for (let i = 0; i < 40; i++) {
      const rowIndex = 7 + i;
      sheet.getRow(rowIndex).getCell(6).value = {
        formula: `D${rowIndex}*E${rowIndex}`,
      };
    }

    // Feuille d'instructions
    const help = workbook.addWorksheet('Instructions');
    help.getColumn(1).width = 100;
    [
      'MODE D\'EMPLOI DU BORDEREAU DES PRIX',
      '',
      '1. Remplissez la feuille "Bordereau" à partir de la ligne 4 (supprimez ou écrasez les lignes EXEMPLE).',
      '2. Colonnes obligatoires : Désignation, Quantité, Prix unitaire HT. Le N° et l\'Unité sont recommandés.',
      '3. Quantité et Prix unitaire doivent être des nombres (sans espaces ni symbole de devise).',
      '4. Le Prix total HT est calculé automatiquement — il sera recalculé par l\'application à l\'import.',
      '5. Les montants sont en FCFA (XOF) hors taxes. La TVA est appliquée par l\'application (taux paramétrable à l\'import, 18 % par défaut).',
      '6. Ne modifiez pas la ligne d\'en-têtes (ligne 3) : l\'import s\'appuie sur ces intitulés.',
      '7. Une fois rempli, importez ce fichier via POST /api/tenders/{id}/price-schedule (ou l\'écran d\'import de l\'application).',
    ].forEach((text, i) => {
      const cell = help.getRow(i + 1).getCell(1);
      cell.value = text;
      if (i === 0) cell.font = { bold: true, size: 12 };
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
