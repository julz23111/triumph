const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_TOKEN || process.env.OPENAI_API_KEY
});

// --- Helpers ---
const DEFAULT_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
const MAX_TOKENS = 500;

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function withRetry(fn, { retries = 3, baseDelayMs = 600 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const status = err?.status || err?.code || 0;
      const retriable = status === 429 || status >= 500;
      if (!retriable || attempt > retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}

/**
 * Analyze ONE image for book spines.
 * Assumes Christian/faith-oriented titles by default and allows "inferred" values when OCR is unclear.
 * Returns a normalized object: { books: [{ title, author, confidence, method }] }
 */
async function analyzeBookImage(base64Image, { model = DEFAULT_MODEL } = {}) {
  try {
    const response = await withRetry(() =>
      openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              {
                type: "text",
                text:
`You are an expert at extracting book titles and author names from bookshelf photos.
Context/Prior: These images are predominantly CHRISTIAN/faith-based books (e.g., Bible translations, devotionals, theology, commentaries, Christian living).
Goals:
- Extract every visible book title and author from the image of one or more spines.
- If multiple books are visible, return ALL of them as an array.
- If text is ambiguous or partly obscured, use domain knowledge to infer the most probable title/author and mark method="inferred".
- If you cannot confidently infer, set the field to "Unknown" and method="unknown".
- Prefer canonical English titles if applicable, and expand common abbreviations (e.g., "Cor." -> "Corinthians", "Jn" -> "John", "KJV" is a valid title fragment only if part of a specific work).

STRICT OUTPUT (JSON only, no commentary):
{
  "books": [
    { "title": "string", "author": "string", "confidence": 0.0-1.0, "method": "ocr|inferred|unknown" }
  ]
}`
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all book titles and authors from this image. Return ONLY JSON with the schema shown above; no extra text."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.1,
        top_p: 0.9
      })
    );

    const raw = response.choices?.[0]?.message?.content?.trim() || "";
    // Parse strict JSON (response_format enforces JSON, but keep a fallback)
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { books: [] };
    }

    // Normalize output
    const books = Array.isArray(parsed?.books) ? parsed.books : [];
    const normalized = books.map(b => ({
      title: (b?.title || "Unknown").trim(),
      author: (b?.author || "Unknown").trim(),
      confidence: typeof b?.confidence === "number" ? Math.max(0, Math.min(1, b.confidence)) : 0,
      method: ["ocr", "inferred", "unknown"].includes(b?.method) ? b.method : "unknown"
    }));

    return { books: normalized };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error('Failed to analyze book image with OpenAI: ' + (error?.message || error));
  }
}

/**
 * Analyze MANY images with simple concurrency.
 * @param {string[]} base64Images - array of base64-encoded JPEG/PNG images
 * @param {object} opts - { concurrency?: number, model?: string }
 * @returns {Promise<{ index:number, books:Array }[]>}
 */
async function analyzeBookImages(base64Images, { concurrency = 5, model = DEFAULT_MODEL } = {}) {
  const results = new Array(base64Images.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= base64Images.length) break;
      try {
        const out = await analyzeBookImage(base64Images[i], { model });
        results[i] = { index: i, ...out };
      } catch (err) {
        results[i] = { index: i, error: String(err?.message || err) };
      }
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, base64Images.length)) }, worker);
  await Promise.all(workers);
  return results;
}

module.exports = {
  analyzeBookImage,
  analyzeBookImages
};
