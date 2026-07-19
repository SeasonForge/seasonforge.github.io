import { en } from './en.js';
import { ru } from './ru.js';
import { getState } from '../store/state.js';

const dictionaries = { en, ru };

export function t(keyPath, variables = {}) {
  const state = getState();
  const lang = state.settings?.lang || 'en';
  const dict = dictionaries[lang] || en;
  
  const keys = keyPath.split('.');
  let current = dict;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      // Fallback to English dictionary if key not found in active lang
      let englishFallback = en;
      for (const fallbackKey of keys) {
        if (englishFallback && typeof englishFallback === 'object' && fallbackKey in englishFallback) {
          englishFallback = englishFallback[fallbackKey];
        } else {
          return keyPath; // Return key path as final fallback
        }
      }
      current = englishFallback;
      break;
    }
  }
  
  if (typeof current !== 'string') {
    return keyPath;
  }
  
  // Replace variables like {game}
  let result = current;
  for (const [key, val] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), val);
  }
  
  return result;
}

// Helper to resolve bilingual database fields (like names or features)
export function getVal(field, langOverride) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) return field;
  
  const state = getState();
  const lang = langOverride || state.settings?.lang || 'en';
  return field[lang] || field.en || field.ru || '';
}

// Detect default locale based on browser
export function detectDefaultLocale() {
  const saved = localStorage.getItem('seasonforge_lang');
  if (saved === 'en' || saved === 'ru') {
    return saved;
  }
  
  const browserLang = navigator.language || navigator.userLanguage || '';
  if (browserLang.toLowerCase().startsWith('ru')) {
    return 'ru';
  }
  
  return 'en';
}
