import Tesseract from 'tesseract.js';
import { env } from '../env.js';
import sharp from 'sharp';
import { OpenAI } from 'openai';

export interface OcrResult {
  text: string;
  title?: string;
  author?: string;
}

const tesseractOptions = {
  logger: () => {}
};

async function runTesseract(buffer: Buffer): Promise<OcrResult> {
  const processed = await sharp(buffer).rotate().toBuffer();
  const result = await Tesseract.recognize(processed, 'eng', tesseractOptions);
  const text = result.data.text.trim();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const title = lines[0];
  const author = lines.length > 1 ? lines.slice(1).join(' ') : undefined;
  return { text, title, author };
}

async function runOpenAI(buffer: Buffer): Promise<OcrResult> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for OpenAI OCR');
  }
  const openai = new OpenAI({ apiKey });
  const base64 = buffer.toString('base64');
  const prompt = 'Extract the book title and author from this book spine photo. Return JSON with keys title, author, text.';
  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: 'You are an OCR extraction helper. Extract book title and author from the provided image.'
      },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          {
            type: 'input_image',
            image_base64: base64
          }
        ]
      }
    ]
  });

  const outputText = response.output_text ?? '';
  let title: string | undefined;
  let author: string | undefined;
  try {
    const parsed = JSON.parse(outputText);
    title = typeof parsed.title === 'string' ? parsed.title : undefined;
    author = typeof parsed.author === 'string' ? parsed.author : undefined;
    return {
      text: typeof parsed.text === 'string' ? parsed.text : outputText,
      title,
      author
    };
  } catch {
    return {
      text: outputText,
      title,
      author
    };
  }
}

export async function runOcr(buffer: Buffer): Promise<OcrResult> {
  if (env.OCR_PROVIDER === 'openai') {
    return runOpenAI(buffer);
  }
  return runTesseract(buffer);
}
