import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PriceScheduleParserService } from './price-schedule-parser.service';
import { PriceScheduleTemplateService } from './price-schedule-template.service';

/** Remplit un template réel comme le ferait l'utilisateur. */
async function filledTemplate(
  rows: Array<[number | string, string, string, unknown, unknown]>,
): Promise<Buffer> {
  const template = await new PriceScheduleTemplateService().build('AO test');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(template as unknown as ArrayBuffer);
  const sheet = workbook.getWorksheet('Bordereau')!;
  // écrase les lignes d'exemple à partir de la ligne 4
  rows.forEach((values, i) => {
    const row = sheet.getRow(4 + i);
    values.forEach((v, j) => (row.getCell(j + 1).value = v as ExcelJS.CellValue));
    row.getCell(6).value = null; // la formule est recalculée côté serveur
  });
  // vide les lignes d'exemple restantes
  for (let i = rows.length; i < 3; i++) {
    const row = sheet.getRow(4 + i);
    for (let c = 1; c <= 6; c++) row.getCell(c).value = null;
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('PriceScheduleParserService (spec 7.3)', () => {
  const parser = new PriceScheduleParserService();

  it('parse un bordereau rempli et recalcule les totaux', async () => {
    const buffer = await filledTemplate([
      [1, 'Installation de chantier', 'fft', 1, 5000000],
      [2, 'Terrassement', 'm3', 1200, 3500],
    ]);

    const result = await parser.parse(buffer);

    expect(result.items).toHaveLength(2);
    expect(result.items[1]).toMatchObject({
      designation: 'Terrassement',
      quantity: 1200,
      unitPrice: 3500,
      totalPrice: 4200000,
    });
    expect(result.totalExclTax).toBe(9200000);
  });

  it('signale les erreurs ligne par ligne en français', async () => {
    const buffer = await filledTemplate([
      [1, 'Ligne valide', 'u', 2, 1000],
      [2, 'Quantité invalide', 'u', 'abc', 1000],
      [3, '', 'u', 5, 1000],
    ]);

    await expect(parser.parse(buffer)).rejects.toMatchObject({
      response: {
        errors: [
          expect.stringContaining('quantité invalide'),
          expect.stringContaining('désignation manquante'),
        ],
      },
    });
  });

  it('ignore les lignes EXEMPLE du template non modifiées', async () => {
    const template = await new PriceScheduleTemplateService().build('AO test');
    await expect(parser.parse(template)).rejects.toThrow(
      BadRequestException, // aucune ligne réelle -> erreur explicite
    );
  });

  it('rejette un fichier non Excel avec un message clair', async () => {
    await expect(
      parser.parse(Buffer.from('ceci n\'est pas un xlsx')),
    ).rejects.toThrow('Fichier illisible');
  });
});
