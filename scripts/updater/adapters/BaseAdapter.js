import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class BaseAdapter {
  constructor(gameId) {
    this.gameId = gameId;
  }

  hashString(str) {
    return crypto.createHash('sha256').update(str || '').digest('hex');
  }

  // Fetch text/HTML from a URL with custom headers
  async fetchUrl(url, options = {}) {
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    };

    const response = await fetch(url, {
      headers: { ...defaultHeaders, ...options.headers },
      ...options
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  // Strip unnecessary tags and extract clean text to save Gemini tokens
  cleanHtml(html) {
    if (!html) return '';
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Get cached game data if it exists
  async getCache() {
    const cachePath = path.join(process.cwd(), 'data', 'cache', `${this.gameId}.json`);
    try {
      if (fs.existsSync(cachePath)) {
        const raw = fs.readFileSync(cachePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`[${this.gameId}] Failed to read cache:`, e.message);
    }
    return null;
  }

  // Write game data to cache
  async writeCache(data) {
    const cacheDir = path.join(process.cwd(), 'data', 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const cachePath = path.join(cacheDir, `${this.gameId}.json`);
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // Call Gemini API to extract structured fields
  async callGemini(text, systemInstruction, schema) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: text
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [
          {
            text: systemInstruction
          }
        ]
      },
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };

    if (schema) {
      requestBody.generationConfig.responseSchema = schema;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Gemini returned an empty response');
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse Gemini response as JSON: ${e.message}\nResponse: ${responseText}`);
    }
  }

  // Normalize Gemini status output to a whitelist-matched code and bilingual label
  normalizeStatus(statusStr) {
    const status = (statusStr || '').toLowerCase().trim();
    const mapping = {
      'active':         { code: 'active',         label: { en: 'Active',         ru: 'Активен' } },
      'in-progress':    { code: 'in-progress',    label: { en: 'In Progress',    ru: 'В разгаре' } },
      'in-development': { code: 'in-development', label: { en: 'In Development', ru: 'В разработке' } },
      'maintenance':    { code: 'maintenance',    label: { en: 'Maintenance',    ru: 'Техобслуживание' } },
      'early-access':   { code: 'early-access',   label: { en: 'Early Access',   ru: 'Ранний доступ' } },
      'ending':         { code: 'ending',         label: { en: 'Ending',         ru: 'Завершается' } },
      'just-started':   { code: 'just-started',   label: { en: 'Just Started',   ru: 'Только начался' } }
    };

    if (mapping[status]) return mapping[status];
    if (status.includes('progress') || status.includes('run'))          return mapping['in-progress'];
    if (status.includes('develop') || status.includes('tba') || status.includes('between')) return mapping['in-development'];
    if (status.includes('maintenance') || status.includes('offline'))   return mapping['maintenance'];
    if (status.includes('early'))                                        return mapping['early-access'];
    if (status.includes('end'))                                          return mapping['ending'];
    if (status.includes('start') || status.includes('launch'))          return mapping['just-started'];
    return mapping['active']; // Default fallback
  }

  // Abstract method to be implemented by child classes
  async fetchAndNormalize(gameConfig) {
    throw new Error('Method fetchAndNormalize() must be implemented');
  }
}
