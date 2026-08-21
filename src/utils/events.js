import { getIconSvg } from './icons.js';
import { escapeHtml } from './helpers.js';

export const TYPE_ICONS = {
  twitch_drops: 'twitch',
  drops: 'twitch',
  stream: 'twitch',
  ptr: 'flask',
  race: 'trophy',
  collab: 'users',
  login: 'gift',
  'login-event': 'gift',
  convention: 'users',
  announcement: 'calendar',
  event: 'calendar'
};

export const GAME_META = {
  'path-of-exile': {
    name: 'Path of Exile 1',
    shortName: 'PoE 1',
    icon: 'skull',
    color: '#d97706',
    accentBg: 'rgba(217, 119, 6, 0.15)',
    borderColor: 'rgba(217, 119, 6, 0.4)'
  },
  'path-of-exile-2': {
    name: 'Path of Exile 2',
    shortName: 'PoE 2',
    icon: 'sparkles',
    color: '#8b5cf6',
    accentBg: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.4)'
  },
  'diablo-iv': {
    name: 'Diablo IV',
    shortName: 'Diablo IV',
    icon: 'flame',
    color: '#ef4444',
    accentBg: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)'
  },
  'last-epoch': {
    name: 'Last Epoch',
    shortName: 'Last Epoch',
    icon: 'hourglass',
    color: '#f59e0b',
    accentBg: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)'
  },
  'torchlight-infinite': {
    name: 'Torchlight: Infinite',
    shortName: 'Torchlight',
    icon: 'zap',
    color: '#06b6d4',
    accentBg: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.4)'
  }
};

export const TYPE_LABELS = {
  twitch_drops: { en: 'Twitch Drops', ru: 'Twitch Drops' },
  drops: { en: 'Twitch Drops', ru: 'Twitch Drops' },
  stream: { en: 'Twitch Stream', ru: 'Стрим' },
  ptr: { en: 'Public Test Realm', ru: 'Тестовый сервер PTR' },
  race: { en: 'Boss Gauntlet & Race', ru: 'Gauntlet & Гонка' },
  collab: { en: 'Collaboration', ru: 'Коллаборация' },
  login: { en: 'Login Rewards', ru: 'Награды за вход' },
  'login-event': { en: 'Login Rewards', ru: 'Награды за вход' },
  convention: { en: 'Convention & Demo', ru: 'Выставка & Демо' },
  announcement: { en: 'Announcement', ru: 'Анонс' },
  event: { en: 'In-Game Event', ru: 'Игровое событие' }
};

export function resolveLocalizedUrl(url, lang = 'en') {
  if (!url) return '';
  if (typeof url === 'object') {
    return url[lang] || url.en || url.ru || '';
  }
  return String(url);
}

export function cleanSourceUrl(url, gameId, lang = 'en') {
  const resolved = resolveLocalizedUrl(url, lang);
  if (!resolved || typeof resolved !== 'string' || !resolved.startsWith('http')) {
    const defaultHubs = {
      'path-of-exile': 'https://www.pathofexile.com/forum',
      'path-of-exile-2': 'https://www.pathofexile.com/forum',
      'diablo-iv': lang === 'ru' ? 'https://news.blizzard.com/ru-ru/diablo4' : 'https://news.blizzard.com/en-us/diablo4',
      'diablo-4': lang === 'ru' ? 'https://news.blizzard.com/ru-ru/diablo4' : 'https://news.blizzard.com/en-us/diablo4',
      'last-epoch': 'https://forum.lastepoch.com',
      'torchlight-infinite': 'https://torchlight.xd.com'
    };
    return defaultHubs[gameId] || '';
  }

  let cleaned = resolved.trim();

  // 1. Steam akamaihd/externalpost URLs conversion
  if (cleaned.includes('steamstore-a.akamaihd.net') || cleaned.includes('/news/externalpost/')) {
    const match = cleaned.match(/steam_community_announcements\/(\d+)/) || cleaned.match(/\/(\d+)$/);
    if (match && match[1]) {
      const appMap = {
        'path-of-exile': 238960,
        'path-of-exile-2': 2694490,
        'last-epoch': 899770,
        'torchlight-infinite': 1974050
      };
      const appId = appMap[gameId] || 238960;
      return `https://store.steampowered.com/news/app/${appId}/view/${match[1]}`;
    }
  }

  // 2. Steam community announcement URLs
  if (cleaned.includes('steamcommunity.com/games/') && cleaned.includes('/announcements/detail/')) {
    const match = cleaned.match(/\/announcements\/detail\/(\d+)/);
    if (match && match[1]) {
      const appMap = {
        'path-of-exile': 238960,
        'path-of-exile-2': 2694490,
        'last-epoch': 899770,
        'torchlight-infinite': 1974050
      };
      const appId = appMap[gameId] || 238960;
      return `https://store.steampowered.com/news/app/${appId}/view/${match[1]}`;
    }
  }

  // 3. Normalize HTTP to HTTPS
  if (cleaned.startsWith('http://')) {
    cleaned = 'https://' + cleaned.slice(7);
  }

  return cleaned;
}

export function getSourceInfo(url, isEn) {
  if (!url) return { label: isEn ? 'Official Link' : 'Официальная ссылка', icon: 'external-link' };
  const lower = url.toLowerCase();
  if (lower.includes('steampowered.com') || lower.includes('steamstore-a.akamaihd.net') || lower.includes('steamcommunity.com')) {
    return { label: isEn ? 'Steam Announcement' : 'Анонс в Steam', icon: 'steam' };
  }
  if (lower.includes('blizzcon.com')) {
    return { label: isEn ? 'BlizzCon Portal' : 'Портал BlizzCon', icon: 'external-link' };
  }
  if (lower.includes('blizzard.com')) {
    return { label: isEn ? 'Blizzard News' : 'Новости Blizzard', icon: 'external-link' };
  }
  if (lower.includes('pathofexile.com')) {
    return { label: isEn ? 'PoE Forum' : 'Форум PoE', icon: 'external-link' };
  }
  if (lower.includes('lastepoch.com')) {
    return { label: isEn ? 'Last Epoch Forum' : 'Форум Last Epoch', icon: 'external-link' };
  }
  if (lower.includes('twitch.tv')) {
    return { label: isEn ? 'Watch on Twitch' : 'Смотреть на Twitch', icon: 'twitch' };
  }
  if (lower.includes('x.com') || lower.includes('twitter.com')) {
    return { label: isEn ? 'Official Post (X)' : 'Официальный пост (X)', icon: 'external-link' };
  }
  return { label: isEn ? 'Official Announcement' : 'Официальный анонс', icon: 'external-link' };
}

export function assignTracks(events) {
  const sorted = [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const tracks = [];

  return sorted.map(event => {
    const start = new Date(event.startDate).getTime();
    const end = event.endDate ? new Date(event.endDate).getTime() : start + 7 * 86400000;

    let trackIndex = tracks.findIndex(lastEnd => start >= lastEnd);

    if (trackIndex === -1) {
      tracks.push(end);
      trackIndex = tracks.length - 1;
    } else {
      tracks[trackIndex] = end;
    }

    return { ...event, trackIndex };
  });
}

