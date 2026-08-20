// Validator class to check data formats and business logic rules
export class Validator {
  static validateGame(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Data must be an object');
    }

    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Missing or invalid game ID');
    }

    if (!data.name || (typeof data.name !== 'string' && typeof data.name !== 'object')) {
      throw new Error('Missing or invalid game name');
    }

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 1;
    const maxYear = currentYear + 5;

    // Validate date format helper
    const isValidDate = (dateStr) => {
      if (!dateStr) return true; // Empty string or null is allowed (TBA)
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      const year = date.getFullYear();
      return year >= minYear && year <= maxYear;
    };

    // Validate season object helper
    const validateSeason = (season, label) => {
      if (!season || typeof season !== 'object') {
        throw new Error(`${label} must be an object`);
      }

      if (season.startDate && !isValidDate(season.startDate)) {
        throw new Error(`Invalid or out-of-range start date in ${label}: ${season.startDate}`);
      }

      if (season.endDate && !isValidDate(season.endDate)) {
        throw new Error(`Invalid or out-of-range end date in ${label}: ${season.endDate}`);
      }

      if (season.startDate && season.endDate) {
        const start = new Date(season.startDate);
        const end = new Date(season.endDate);
        if (start.getTime() >= end.getTime()) {
          throw new Error(`Start date must be before end date in ${label}`);
        }
      }

      const validVerifications = ['official', 'ai', 'estimated', 'announcement'];
      if (season.verification && !validVerifications.includes(season.verification)) {
        throw new Error(`Invalid verification value in ${label}: ${season.verification}. Must be one of ${validVerifications.join(', ')}`);
      }
    };

    if (data.currentSeason) {
      validateSeason(data.currentSeason, 'currentSeason');
    }

    if (data.nextSeason) {
      validateSeason(data.nextSeason, 'nextSeason');
    }

    // Validate features
    if (data.features && !Array.isArray(data.features) && typeof data.features !== 'object') {
      throw new Error('Features must be an array or an object (bilingual)');
    }

    // Validate status code against the whitelist used by the frontend i18n dictionary
    if (data.status?.code) {
      const validStatusCodes = ['active', 'in-progress', 'in-development', 'maintenance', 'early-access', 'ending', 'just-started', 'late-season', 'final-days', 'upcoming', 'ended'];
      if (!validStatusCodes.includes(data.status.code)) {
        throw new Error(`Invalid status code: "${data.status.code}". Must be one of: ${validStatusCodes.join(', ')}`);
      }
    }

    return true;
  }

  static validateEvent(evt) {
    if (!evt || typeof evt !== 'object') {
      throw new Error('Event must be an object');
    }
    if (!evt.id || typeof evt.id !== 'string') {
      throw new Error('Missing or invalid event ID');
    }
    if (!evt.gameId || typeof evt.gameId !== 'string') {
      throw new Error(`Missing gameId in event ${evt.id}`);
    }

    const validTypes = ['twitch_drops', 'drops', 'ptr', 'race', 'collab', 'login', 'login-event', 'event', 'special_server', 'stream'];
    if (evt.type && !validTypes.includes(evt.type)) {
      throw new Error(`Invalid event type "${evt.type}" in ${evt.id}. Must be one of: ${validTypes.join(', ')}`);
    }

    // STRICT REJECTION: Seasons, Cycles, and Expansions belong in seasons.json, NEVER in events.json
    const titleEn = (evt.title_en || '').toLowerCase();
    const isSeasonLaunch = /^(season\s+\d+|cycle\s+\d+|league\s+\d+|expansion)/i.test(titleEn) ||
      (/\b(new season|upcoming cycle|next season|next cycle)\b/i.test(titleEn) && !/\b(ptr|test|drops|login|race|collab|crossover|hardcore\s+server)\b/i.test(titleEn));
    if (isSeasonLaunch && !['ptr', 'login', 'race', 'special_server', 'collab'].includes(evt.type)) {
      throw new Error(`Rejected event ${evt.id}: Main season/cycle announcements belong in seasons.json, not events.json`);
    }

    if (!evt.startDate || Number.isNaN(new Date(evt.startDate).getTime())) {
      throw new Error(`Invalid or missing startDate in event ${evt.id}`);
    }

    if (evt.endDate) {
      const startMs = new Date(evt.startDate).getTime();
      const endMs = new Date(evt.endDate).getTime();
      if (Number.isNaN(endMs)) {
        throw new Error(`Invalid endDate in event ${evt.id}`);
      }
      if (startMs >= endMs) {
        throw new Error(`startDate must be before endDate in event ${evt.id}`);
      }
      // Maximum 90 days duration for seasonal collabs/special servers, 35 days for micro-events
      const maxDays = (evt.type === 'collab' || evt.type === 'special_server') ? 90 : 35;
      if ((endMs - startMs) > (maxDays * 86400000)) {
        console.warn(`[Validator] Warning: Event ${evt.id} duration exceeds ${maxDays} days (${Math.round((endMs - startMs)/86400000)}d). Clamping to ${maxDays} days.`);
        evt.endDate = new Date(startMs + maxDays * 86400000).toISOString();
      }
    }

    return true;
  }
}

