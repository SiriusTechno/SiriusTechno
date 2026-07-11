import { BadRequestException } from '@nestjs/common';
import { TextExtractionService } from './text-extraction.service';

jest.mock('pdf-parse/lib/pdf-parse.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('mammoth', () => ({ extractRawText: jest.fn() }));

import * as mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const pdfParseMock = pdfParse as jest.MockedFunction<typeof pdfParse>;
const mammothMock = mammoth.extractRawText as jest.Mock;

const PDF = 'application/pdf';
const DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('TextExtractionService (spec 5.1)', () => {
  const service = new TextExtractionService();

  beforeEach(() => jest.clearAllMocks());

  it('extrait le texte d\'un PDF natif sans signaler d\'OCR', async () => {
    pdfParseMock.mockResolvedValue({
      text: 'x'.repeat(5000),
      numpages: 10,
    } as never);

    const result = await service.extract(Buffer.from(''), PDF);

    expect(result.needsOcr).toBe(false);
    expect(result.charCount).toBe(5000);
    expect(result.pageCount).toBe(10);
  });

  it('détecte un PDF scanné (peu de texte par page) → OCR requis', async () => {
    pdfParseMock.mockResolvedValue({
      text: 'numérisé le 12/03',
      numpages: 40,
    } as never);

    const result = await service.extract(Buffer.from(''), PDF);

    expect(result.needsOcr).toBe(true);
  });

  it('extrait le texte d\'un .docx via mammoth', async () => {
    mammothMock.mockResolvedValue({ value: 'Cahier des charges…', messages: [] });

    const result = await service.extract(Buffer.from(''), DOCX);

    expect(result.text).toBe('Cahier des charges…');
    expect(result.needsOcr).toBe(false);
  });

  it('rejette les formats non pris en charge avec un message en français', async () => {
    await expect(
      service.extract(Buffer.from(''), 'image/png'),
    ).rejects.toThrow(BadRequestException);
  });
});
