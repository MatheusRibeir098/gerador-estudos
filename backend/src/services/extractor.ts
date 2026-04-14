import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';

export async function extractText(
  buffer: Buffer,
  mimetype: string,
  _filename: string
): Promise<{ text: string; fileType: 'pdf' | 'docx' | 'image' }> {
  if (mimetype.includes('pdf')) {
    const uint8 = new Uint8Array(buffer);
    const parser = new (PDFParse as any)(uint8);
    await parser.load();
    const result = await parser.getText();
    const text = typeof result === 'string' ? result : result?.text ?? '';
    return { text, fileType: 'pdf' };
  }

  if (mimetype.includes('word') || mimetype.includes('docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, fileType: 'docx' };
  }

  if (mimetype.includes('image')) {
    const worker = await createWorker('por+eng');
    const result = await worker.recognize(buffer);
    await worker.terminate();
    return { text: result.data.text, fileType: 'image' };
  }

  throw new Error('Formato não suportado: ' + mimetype);
}
