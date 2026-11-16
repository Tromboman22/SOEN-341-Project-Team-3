import { PDFParse } from 'pdf-parse';
import fs from 'fs';

export async function extractResumeText(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || '';
  } catch (err) {
    console.error('PDF extraction failed:', err.message);
    return null;
  }
}