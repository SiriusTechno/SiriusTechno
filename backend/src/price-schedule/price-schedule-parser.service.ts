import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { TEMPLATE_SHEET_NAME } from './price-schedule-template.service';

export interface PriceLine {
  number: number;
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ParsedSchedule {
  items: PriceLine[];
  totalExclTax: number;
}

const HEADER_DESIGNATION = 'désignation';

/**
 * Parse le bordereau de prix rempli à partir du template Excel (spec 7.3).
 * Validation ligne par ligne avec messages en français ; les totaux sont
 * TOUJOURS recalculés côté serveur (jamais repris du fichier).
 */
@Injectable()
export class PriceScheduleParserService {
  async parse(buffer: Buffer): Promise<ParsedSchedule> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      throw new BadRequestException(
        'Fichier illisible : le bordereau doit être un fichier Excel (.xlsx) issu du template fourni.',
      );
    }

    const sheet =
      workbook.getWorksheet(TEMPLATE_SHEET_NAME) ?? workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Le fichier Excel ne contient aucune feuille.');
    }

    // Localise la ligne d'en-têtes (contient "Désignation")
    let headerRowIndex = 0;
    sheet.eachRow((row, index) => {
      if (headerRowIndex) return;
      const values = (row.values as unknown[]).map((v) =>
        String(v ?? '').toLowerCase(),
      );
      if (values.some((v) => v.includes(HEADER_DESIGNATION))) {
        headerRowIndex = index;
      }
    });
    if (!headerRowIndex) {
      throw new BadRequestException(
        'Ligne d\'en-têtes introuvable : conservez la ligne "N° / Désignation / Unité / Quantité / Prix unitaire HT" du template.',
      );
    }

    const items: PriceLine[] = [];
    const errors: string[] = [];

    for (let i = headerRowIndex + 1; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const designation = this.text(row.getCell(2));
      const quantityRaw = row.getCell(4);
      const unitPriceRaw = row.getCell(5);

      // Ligne vide (ou ne contenant que la formule de total) : ignorée
      if (!designation && this.isEmpty(quantityRaw) && this.isEmpty(unitPriceRaw)) {
        continue;
      }
      // Lignes d'exemple laissées telles quelles : ignorées
      if (designation.toUpperCase().startsWith('EXEMPLE')) {
        continue;
      }

      if (!designation) {
        errors.push(`Ligne ${i} : désignation manquante.`);
        continue;
      }
      const quantity = this.numeric(quantityRaw);
      const unitPrice = this.numeric(unitPriceRaw);
      if (quantity === null || quantity <= 0) {
        errors.push(
          `Ligne ${i} (« ${designation.slice(0, 40)} ») : quantité invalide — nombre strictement positif attendu.`,
        );
      }
      if (unitPrice === null || unitPrice < 0) {
        errors.push(
          `Ligne ${i} (« ${designation.slice(0, 40)} ») : prix unitaire invalide — nombre attendu, sans espaces ni devise.`,
        );
      }
      if (quantity === null || unitPrice === null || quantity <= 0 || unitPrice < 0) {
        continue;
      }

      items.push({
        number: this.numeric(row.getCell(1)) ?? items.length + 1,
        designation,
        unit: this.text(row.getCell(3)),
        quantity,
        unitPrice,
        totalPrice: Math.round(quantity * unitPrice * 100) / 100,
      });
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: `Le bordereau contient ${errors.length} erreur(s) — corrigez puis ré-importez.`,
        errors,
      });
    }
    if (items.length === 0) {
      throw new BadRequestException(
        'Aucune ligne de prix exploitable : remplissez le bordereau à partir de la ligne 4 du template.',
      );
    }

    const totalExclTax =
      Math.round(items.reduce((sum, l) => sum + l.totalPrice, 0) * 100) / 100;
    return { items, totalExclTax };
  }

  private text(cell: ExcelJS.Cell): string {
    const v = cell.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object' && 'richText' in v) {
      return v.richText.map((r) => r.text).join('').trim();
    }
    if (typeof v === 'object' && 'result' in v) {
      return String(v.result ?? '').trim();
    }
    return String(v).trim();
  }

  private isEmpty(cell: ExcelJS.Cell): boolean {
    const v = cell.value;
    if (v === null || v === undefined || v === '') return true;
    // cellule ne contenant qu'une formule de total sans résultat
    if (typeof v === 'object' && 'formula' in v && !('result' in v && v.result)) {
      return true;
    }
    return false;
  }

  private numeric(cell: ExcelJS.Cell): number | null {
    const v = cell.value;
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && 'result' in v && typeof v.result === 'number') {
      return v.result;
    }
    if (typeof v === 'string') {
      const parsed = Number(v.replace(/\s/g, '').replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}
