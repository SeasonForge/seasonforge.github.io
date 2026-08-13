import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { atomicWriteFileSync } from '../fileUtils.js';

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

    const controller = new AbortController();
    const timeoutMs = options.timeout || 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { ...defaultHeaders, ...options.headers },
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Fetch timeout (${timeoutMs}ms) for ${url}`);
      }
      throw err;
    }
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

  // Classify news item importance into 5 categories: critical, major, important, minor, noise
  classifyImportance(item, extraKeywords = []) {
    const title = (item.title || item.properties?.title || '').toLowerCase();
    const desc = (item.description || item.properties?.summary || '').toLowerCase();
    const text = `${title} ${desc}`;

    // Noise: typos, duplicate posts, shop/mystery box microtransactions, fan art/cosplay competitions
    if (/mystery box|supporter pack|microtransaction|store|shop sale|typo|translation fix|fan art|fanart|competition|cosplay/i.test(text)) {
      return 'noise';
    }

    // Minor: minor bug fixes, small hotfixes, ui fixes, visual tweaks
    if (/hotfix|bug fix|technical issue|improvements|maintenance|server restart/i.test(text) && 
        !/expansion|league|season|cycle|gamescom|exilecon|blizzcon|campfire/i.test(text)) {
      return 'minor';
    }

    // Critical: major conventions, releases, EA, stream reveals, roadmap, acts
    const criticalKeywords = ['gamescom', 'exilecon', 'blizzcon', 'summer game fest', 'opening night live', 'early access', 'release date', 'launch date', 'roadmap', 'act reveal', 'ggg live', 'campfire chat', 'showcase'];
    if (criticalKeywords.some(kw => text.includes(kw))) {
      return 'critical';
    }

    // Major: new league/season/cycle announcements, major expansions, new classes/ascendancies
    const majorKeywords = ['announcing', 'expansion', 'new league', 'new season', 'new cycle', 'manifesto', 'ascendancy', 'class reveal', 'major update', 'endgame overhaul'];
    if (majorKeywords.some(kw => text.includes(kw))) {
      return 'major';
    }

    // Important: patch notes, PTR, balance changes, economy overhauls
    const importantKeywords = ['patch notes', 'ptr', 'public test', 'beta', 'balance changes', 'developer interview', 'qol', 'twitch drops', ...extraKeywords.map(k => k.toLowerCase())];
    if (importantKeywords.some(kw => text.includes(kw))) {
      return 'important';
    }

    return 'important'; // default fallback for unclassified items
  }

  // Pre-filter raw news items by timeline keywords & importance categories to save Gemini tokens
  filterRelevantNews(items, extraKeywords = []) {
    if (!Array.isArray(items)) return [];

    return items
      .map(item => {
        const category = this.classifyImportance(item, extraKeywords);
        return { ...item, _category: category };
      })
      .filter(item => item._category !== 'noise' && item._category !== 'minor');
  }

  // Validate and normalize dates returned by Gemini strictly to ISO 8601 strings (YYYY-MM-DD or full ISO)
  normalizeAndValidateDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const trimmed = dateStr.trim();
    if (trimmed === '' || trimmed.toUpperCase() === 'TBA') return '';

    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return '';

    // Check year range safety
    const year = d.getFullYear();
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 2 || year > currentYear + 5) return '';

    return d.toISOString();
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

  // Write game data to cache atomically (prevents corrupt files on crash)
  async writeCache(data) {
    const cacheDir = path.join(process.cwd(), 'data', 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const cachePath = path.join(cacheDir, `${this.gameId}.json`);
    atomicWriteFileSync(cachePath, JSON.stringify(data, null, 2));
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Gemini API request timed out (15000ms)');
      }
      throw err;
    }

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
