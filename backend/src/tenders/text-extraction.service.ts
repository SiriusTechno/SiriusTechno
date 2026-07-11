import { BadRequestException, Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export interface ExtractionResult {
  text: string;
  charCount: number;
  pageCount: number | null;
  /** PDF scanné probable : trop peu de texte natif, OCR requis (spec 5.1). */
  needsOcr: boolean;
}

/**
 * Extraction du texte des documents d'AO (spec 5.1).
 * - .docx : mammoth
 * - .pdf  : pdf-parse (PDF texte)
 * - Fallback OCR : détecté et signalé (statut NEEDS_OCR) — l'intégration
 *   Tesseract viendra dans une itération ultérieure ; en attendant l'API
 *   signale explicitement le cas au lieu d'échouer silencieusement.
 */
@Injectable()
export class TextExtractionService {
  /** Seuil de caractères par page en dessous duquel on suspecte un scan. */
  private static readonly MIN_CHARS_PER_PAGE = 80;

  async extract(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
    if (
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return this.extractDocx(buffer);
    }
    if (mimeType === 'application/pdf') {
      return this.extractPdf(buffer);
    }
    throw new BadRequestException(
      `Format non pris en charge pour un AO : ${mimeType} (formats acceptés : PDF, Word)`,
    );
  }

  private async extractDocx(buffer: Buffer): Promise<ExtractionResult> {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    return {
      text,
      charCount: text.length,
      pageCount: null,
      needsOcr: text.length === 0,
    };
  }

  private async extractPdf(buffer: Buffer): Promise<ExtractionResult> {
    const parsed = await pdfParse(buffer);
    const text = parsed.text.trim();
    const pageCount = parsed.numpages || null;
    const charsPerPage = pageCount ? text.length / pageCount : text.length;
    return {
      text,
      charCount: text.length,
      pageCount,
      needsOcr:
        charsPerPage < TextExtractionService.MIN_CHARS_PER_PAGE,
    };
  }
}
